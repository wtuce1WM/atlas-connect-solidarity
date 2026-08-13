#!/usr/bin/env python3
"""
Capture générique du template vidéo « feed in-app » de One World Morocco.

Rejoue exactement le calibrage mis au point pour la vidéo « Riads à Marrakech »,
mais à partir d'une simple URL de feed. Tout ce qui était en dur dans la
composition Remotion est ici mesuré dans le DOM puis écrit dans un manifest.

Sorties dans remotion/public/feed/<slug>/ :
  chrome<N>.png    UI du slidepanel détourée en alpha (2 passes noir/blanc)
  frames/v<N>/*.jpg  frames de la vidéo interne de chaque étape
  descopen.png     en-tête de l'overlay Full Description (alpha)
  desctall.png     overlay Full Description entier, stitché (alpha)
  manifest.json    géométrie + nb de frames + sections d'arrêt + rythme

Exemple :
  python3 remotion/capture/capture_feed.py \
    --url "https://oneworldmorocco.com/search?subcats=Night%20Club&city=Marrakech" \
    --slug vie-nocturne --steps 6

Notes :
  - --url peut être une URL de prod : elle est réécrite vers le serveur local
    (--origin, http://localhost:8080 par défaut) pour capturer le code courant.
  - Les positions des sections d'arrêt sont lues dans le DOM (pas d'OCR), donc
    valables pour n'importe quelle fiche et n'importe quelle hauteur d'overlay.
"""
import argparse
import asyncio
import json
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlparse, urlunparse

from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]  # remotion/
PUBLIC = ROOT / "public" / "feed"

# Sections sur lesquelles la vidéo doit s'arrêter dans l'overlay Full Description.
DEFAULT_SECTIONS = ["Avis clients", "Vidéos", "Assistant IA", "À proximité"]

# Labels du rail de CTA à neutraliser en position fermée (on garde les icônes).
RAIL_WORDS = [
    "LANGUE", "DISPONIBILITÉ", "DISPONIBILITE", "LOCALISATION",
    "ITINÉRAIRE", "ITINERAIRE", "TRADUIRE", "PARTAGER",
]

HIDE_RAIL = """(words)=>{
  const kill=()=>{[...document.querySelectorAll('div,span,button')].forEach(e=>{
    const t=(e.textContent||'').trim().toUpperCase();
    if(e.children.length<=1 && words.includes(t)){
      e.style.visibility='hidden';
      if(e.parentElement) e.parentElement.style.visibility='hidden';
    }})};
  kill(); window.__owmKill=kill; setInterval(kill,400);
}"""

SET_BG = """(c)=>{
  let s=document.getElementById('owmcap');
  if(!s){s=document.createElement('style');s.id='owmcap';document.head.appendChild(s)}
  s.textContent='.bg-black{background-color:'+c+'!important}video{opacity:0!important}';
  if(window.__owmKill) window.__owmKill();
  if(window.__owmStuck) window.__owmStuck();
}"""


SWIPE = """async ()=>{
  const el=document.elementFromPoint(360,700);
  const mk=(t,y)=>{const tt=new Touch({identifier:1,target:el,clientX:360,clientY:y});
    return new TouchEvent(t,{touches:t==='touchend'?[]:[tt],targetTouches:t==='touchend'?[]:[tt],
      changedTouches:[tt],bubbles:true,cancelable:true})};
  el.dispatchEvent(mk('touchstart',900));
  for(let y=880;y>300;y-=40){el.dispatchEvent(mk('touchmove',y));await new Promise(r=>setTimeout(r,16))}
  el.dispatchEvent(mk('touchend',300));
}"""

# Ouvre l'overlay « Full Description » (dernier élément terminal contenant « plus »).
OPEN_DESC = """()=>{
  const els=[...document.querySelectorAll('*')].filter(e=>e.children.length===0 && /plus/.test(e.textContent||''));
  const t=els[els.length-1]; if(!t) return false; t.click(); return true;
}"""

PANEL_INFO = """()=>{
  const v=document.querySelector('video');
  const p=document.querySelector('[class*="z-[220]"]');
  return {src: v?(v.currentSrc||v.src):null, txt: p?p.innerText:''};
}"""

MARK_SCROLLER = """()=>{
  const sc=document.querySelector('#owm-desc-scroll');
  if(!sc) return null;
  sc.dataset.owm='1';
  const r=sc.getBoundingClientRect();
  const overlay=sc.closest('[data-owm-video-overlay]');
  if(overlay) overlay.dataset.owmOverlay='1';
  const header=overlay?.querySelector('[data-owm-video-header]');
  const bottom=overlay?.querySelector('[data-owm-video-bottom-bar]');
  const hr=header?.getBoundingClientRect();
  const br=bottom?.getBoundingClientRect();
  return {top:Math.round(r.top),left:Math.round(r.left),width:Math.round(r.width),
          view:Math.round(r.height),content:sc.scrollHeight,max:sc.scrollHeight-sc.clientHeight,
          headerTop:hr?Math.round(hr.top):0,headerHeight:hr?Math.round(hr.height):Math.round(r.top),
          bottomTop:br?Math.round(br.top):null,bottomHeight:br?Math.round(br.height):0};
}"""

# Position absolue (dans le contenu scrollable) de chaque titre de section.
SECTION_TOPS = """(labels)=>{
  const sc=document.querySelector('[data-owm="1"]');
  if(!sc) return [];
  const base=sc.getBoundingClientRect().top - sc.scrollTop;
  const norm=(s)=>(s||'').replace(/\\s+/g,' ').trim().toLowerCase();
  const out=[];
  for(const label of labels){
    const hit=[...sc.querySelectorAll('*')]
      .filter(e=>e.children.length===0 && norm(e.textContent).startsWith(norm(label)))
      .map(e=>Math.round(e.getBoundingClientRect().top - base))
      .filter(v=>v>0)
      .sort((a,b)=>a-b)[0];
    if(hit!==undefined) out.push({label, top:hit});
  }
  return out.sort((a,b)=>a.top-b.top);
}"""

# Coordonnées du déclencheur d'ouverture (pour placer le tap animé).
TRIGGER_POS = """()=>{
  const els=[...document.querySelectorAll('*')].filter(e=>e.children.length===0 && /plus/.test(e.textContent||''));
  const t=els[els.length-1]; if(!t) return null;
  const r=t.getBoundingClientRect();
  return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2)};
}"""

# Avant les bandes de scroll : neutralise tout ce qui est position:fixed ou
# sticky (barre d'onglets collante de l'overlay, barre « liquid glass » du bas
# du SlidePanel). Ces éléments restent au même endroit du viewport dans chaque
# bande : stitchés tels quels, ils se dupliquent dans la hauteur du montage.
# visibility:hidden (et non display:none) pour ne pas changer la géométrie.
HIDE_STUCK = """()=>{
  const sc=document.querySelector('[data-owm="1"]');
  const overlay=document.querySelector('[data-owm-overlay="1"]');
  const kill=()=>{
    if(!sc || !overlay) return;
    [...overlay.querySelectorAll('*')].forEach(e=>{
      if(e===sc || e.contains(sc)) return;
      if(!sc.contains(e)){
        e.dataset.owmStuck='1'; e.style.visibility='hidden'; return;
      }
      const p=getComputedStyle(e).position;
      if(p==='fixed' || p==='sticky'){
        e.dataset.owmStuck='1'; e.style.visibility='hidden';
      }
    });
  };
  kill(); window.__owmStuck=kill; setInterval(kill,400);
}"""



def local_url(url: str, origin: str) -> str:
    o = urlparse(origin)
    u = urlparse(url)
    return urlunparse((o.scheme, o.netloc, u.path, u.params, u.query, u.fragment))


def alpha_merge(black: Path, white: Path, out: Path) -> None:
    """Détourage : deux captures identiques sur fond noir puis blanc -> RGBA."""
    b = Image.open(black).convert("RGB")
    w = Image.open(white).convert("RGB")
    if b.size != w.size:
        w = w.resize(b.size)
    bp, wp = b.load(), w.load()
    res = Image.new("RGBA", b.size)
    rp = res.load()
    for y in range(b.size[1]):
        for x in range(b.size[0]):
            br, bg, bb = bp[x, y]
            wr, wg, wb = wp[x, y]
            a = 255 - max(wr - br, wg - bg, wb - bb)
            if a <= 2:
                rp[x, y] = (0, 0, 0, 0)
            else:
                k = 255 / a
                rp[x, y] = (
                    min(255, int(br * k)), min(255, int(bg * k)), min(255, int(bb * k)), a,
                )
    res.save(out)


def stitch(bands: list[tuple[Path, int]], width: int, view: int, total: int, out: Path) -> None:
    """Assemble les bandes scrollées (alpha) en une seule image de hauteur réelle."""
    canvas = Image.new("RGBA", (width, total), (0, 0, 0, 0))
    for path, offset in bands:
        band = Image.open(path).convert("RGBA")
        canvas.paste(band, (0, offset), band)
    canvas.save(out)


def extract_frames(src: str, dest: Path, fps: int, seconds: float, tmp: Path,
                   width: int = 720, height: int = 1280, dsf: int = 2) -> int:
    """Extrait des frames en « cover » du cadre demandé.

    On met à l'échelle avec force_original_aspect_ratio=increase avant de rogner :
    une source verticale rendue dans un cadre 16:9 (montage paysage) donnerait
    sinon une largeur inférieure au crop et ffmpeg échouerait.
    Un échec (source injoignable, codec) renvoie 0 au lieu de casser tout le job.
    """
    dest.mkdir(parents=True, exist_ok=True)
    tw, th = width * dsf, height * dsf
    mp4 = tmp / (re.sub(r"[^a-zA-Z0-9]+", "_", src)[-60:] + ".mp4")
    try:
        if not mp4.exists():
            subprocess.run(["curl", "-sfL", src, "-o", str(mp4)], check=True)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp4), "-t", str(seconds),
             "-vf",
             f"fps={fps},scale={tw}:{th}:force_original_aspect_ratio=increase,crop={tw}:{th}",
             "-q:v", "1",
             str(dest / "%04d.jpg")],
            check=True,
        )
    except subprocess.CalledProcessError as e:
        print("frames_error", src, str(e), flush=True)
    return len(list(dest.glob("*.jpg")))




async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True, help="URL du feed /search (prod ou locale)")
    ap.add_argument("--slug", required=True, help="dossier de sortie dans public/feed/")
    ap.add_argument("--label", default=None)
    ap.add_argument("--steps", type=int, default=6)
    ap.add_argument("--origin", default="http://localhost:8080")
    ap.add_argument("--width", type=int, default=720)
    ap.add_argument("--height", type=int, default=1280)
    ap.add_argument("--fps", type=int, default=25)
    ap.add_argument("--step-seconds", type=float, default=3.0)
    ap.add_argument("--detail-seconds", type=float, default=21.0)
    ap.add_argument("--sections", default=",".join(DEFAULT_SECTIONS))
    ap.add_argument("--band-step", type=int, default=900)
    ap.add_argument("--dsf", type=int, default=2,
                    help="device scale factor de capture (suréchantillonnage)")
    ap.add_argument("--wide", action="store_true",
                    help="extrait aussi des frames vidéo 16:9 plein cadre (montage paysage)")
    ap.add_argument("--output-scale", type=float, default=1.5,
                    help="facteur d'agrandissement du rendu portrait (720x1280 -> 1080x1920)")
    args = ap.parse_args()

    sections = [s.strip() for s in args.sections.split(",") if s.strip()]
    out = PUBLIC / args.slug
    tmp = Path("/tmp/feed-capture") / args.slug
    raw = tmp / "raw"
    for d in (out, raw):
        d.mkdir(parents=True, exist_ok=True)
    (out / "frames").mkdir(exist_ok=True)

    url = local_url(args.url, args.origin)
    print("capture", url, flush=True)

    steps_meta: list[dict] = []
    detail: dict | None = None

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = await browser.new_context(
            viewport={"width": args.width, "height": args.height},
            device_scale_factor=args.dsf, has_touch=True, is_mobile=True,
        )
        pg = await ctx.new_page()
        await pg.goto(url, wait_until="domcontentloaded")
        await pg.wait_for_timeout(9000)
        try:
            await pg.get_by_role("button", name="Refuser").click(timeout=3000)
        except Exception:
            pass

        await pg.evaluate(HIDE_RAIL, RAIL_WORDS)

        # Ouvre le premier résultat du feed.
        await pg.evaluate(
            """()=>{const c=[...document.querySelectorAll('[class*="cursor-pointer"],a,button')]
                 .find(e=>e.getBoundingClientRect().height>120); if(c) c.click();}"""
        )
        await pg.wait_for_timeout(5000)
        await pg.evaluate(HIDE_RAIL, RAIL_WORDS)

        async def setbg(color: str) -> None:
            await pg.evaluate(SET_BG, color)
            await pg.wait_for_timeout(320)

        for i in range(args.steps):
            try:
                await pg.get_by_role("button", name="Fermer", exact=True).last.click(timeout=1500)
            except Exception:
                pass
            await pg.wait_for_timeout(1500)
            info = await pg.evaluate(PANEL_INFO)
            await setbg("#000000")
            await pg.screenshot(path=str(raw / f"s{i+1}_black.png"))
            await setbg("#ffffff")
            await pg.screenshot(path=str(raw / f"s{i+1}_white.png"))
            name = (info["txt"] or "").split("\n")[0][:80]
            steps_meta.append({"index": i + 1, "name": name, "src": info["src"]})
            print("step", i + 1, name, flush=True)
            if i < args.steps - 1:
                await setbg("#000000")
                await pg.evaluate(SWIPE)
                await pg.wait_for_timeout(2800)

        # --- Overlay Full Description sur la dernière étape
        trigger = await pg.evaluate(TRIGGER_POS)
        opened = await pg.evaluate(OPEN_DESC)
        await pg.wait_for_timeout(3500)
        geo = await pg.evaluate(MARK_SCROLLER) if opened else None
        if geo:
            tops = await pg.evaluate(SECTION_TOPS, sections)
            for col, tag in (("#000000", "black"), ("#ffffff", "white")):
                await setbg(col)
                await pg.screenshot(path=str(raw / f"descopen_{tag}.png"))
            # En-tête capturé : on neutralise ensuite les éléments collants/fixes
            # pour que le contenu stitché ne les répète pas dans la hauteur.
            await pg.evaluate(HIDE_STUCK)
            await pg.wait_for_timeout(400)
            bands: list[tuple[int, int]] = []  # (index, scrollTop réel)

            s = 0
            while True:
                await pg.evaluate("(v)=>{document.querySelector('[data-owm=\"1\"]').scrollTop=v}", s)
                await pg.wait_for_timeout(900)
                real = await pg.evaluate("()=>document.querySelector('[data-owm=\"1\"]').scrollTop")
                for col, tag in (("#000000", "black"), ("#ffffff", "white")):
                    await setbg(col)
                    await pg.screenshot(path=str(raw / f"sc{len(bands)}_{tag}.png"))
                bands.append((len(bands), int(real)))
                print("band", len(bands) - 1, real, "/", geo["max"], flush=True)
                if real >= geo["max"] - 2 or s > geo["max"]:
                    break
                s += args.band_step
            detail = {"geo": geo, "tops": tops, "bands": bands, "trigger": trigger}
        await browser.close()

    # --- Détourage alpha des UI d'étapes
    for st in steps_meta:
        i = st["index"]
        alpha_merge(raw / f"s{i}_black.png", raw / f"s{i}_white.png", out / f"chrome{i}.png")
        print("alpha chrome", i, flush=True)

    # --- Frames vidéo de chaque étape
    for st in steps_meta:
        i = st["index"]
        seconds = args.detail_seconds if i == len(steps_meta) else args.step_seconds
        st["frameDir"] = f"frames/v{i}"
        st["frameCount"] = (
            extract_frames(st["src"], out / "frames" / f"v{i}", args.fps, seconds, tmp,
                           args.width, args.height, args.dsf)
            if st["src"] else 0
        )
        print("frames", i, st["frameCount"], flush=True)
        # Format paysage : frames non recadrées (16:9 plein cadre), la UI de la
        # fiche étant superposée par-dessus dans la colonne centrale.
        if args.wide and st["src"]:
            st["wideFrameDir"] = f"frames/w{i}"
            st["wideFrameCount"] = extract_frames(
                st["src"], out / "frames" / f"w{i}", args.fps, seconds, tmp, 1920, 1080, 1
            )
            print("wide frames", i, st["wideFrameCount"], flush=True)

    manifest_detail = None
    if detail:
        geo, bands = detail["geo"], detail["bands"]
        alpha_merge(raw / "descopen_black.png", raw / "descopen_white.png", out / "descopen.png")
        band_paths = []
        for idx, real in bands:
            merged = raw / f"band{idx}.png"
            alpha_merge(raw / f"sc{idx}_black.png", raw / f"sc{idx}_white.png", merged)
            # Les screenshots sont en pixels physiques (DSF), tandis que les
            # mesures DOM sont en pixels CSS. L'ancien crop utilisait les
            # coordonnées CSS sur une image 2x : il ne gardait que la moitié
            # gauche du viewport en paysage.
            scale = args.dsf
            crop = Image.open(merged).crop((
                geo["left"] * scale,
                geo["top"] * scale,
                (geo["left"] + geo["width"]) * scale,
                (geo["top"] + geo["view"]) * scale,
            ))
            cp = raw / f"bandcrop{idx}.png"
            crop.save(cp)
            band_paths.append((cp, real * scale))
        stitch(
            band_paths,
            geo["width"] * args.dsf,
            geo["view"] * args.dsf,
            geo["content"] * args.dsf,
            out / "desctall.png",
        )
        manifest_detail = {
            "step": len(steps_meta),
            "open": "descopen.png",
            "tall": "desctall.png",
            "headerTop": geo.get("headerTop", 0),
            "headerHeight": geo.get("headerHeight", geo["top"]),
            "viewHeight": geo["view"],
            "contentHeight": geo["content"],
            "bottomTop": geo.get("bottomTop"),
            "bottomHeight": geo.get("bottomHeight", 0),
            "tapX": (detail["trigger"] or {}).get("x", args.width // 2),
            "tapY": (detail["trigger"] or {}).get("y", args.height - 120),
            "sections": detail["tops"],
        }
        print("desctall", geo["content"], "px, sections", detail["tops"], flush=True)

    manifest = {
        "slug": args.slug,
        "base": f"feed/{args.slug}",
        "label": args.label or args.slug,
        "sourceUrl": args.url,
        "viewport": {"width": args.width, "height": args.height},
        "captureScale": args.dsf,
        "outputScale": args.output_scale,
        "fps": args.fps,
        "steps": [
            {"index": s["index"], "name": s["name"], "chrome": f"chrome{s['index']}.png",
             "frameDir": s["frameDir"], "frameCount": s["frameCount"],
             "wideFrameDir": s.get("wideFrameDir"), "wideFrameCount": s.get("wideFrameCount", 0)}
            for s in steps_meta
        ],
        "detail": manifest_detail,
        "timing": {
            "stepFrames": int(args.step_seconds * args.fps),
            "slideFrames": 10,
            "detailHold": 100,
            "tapFrames": 20,
            "openFrames": 12,
            "hookHold": 50,
            "firstMove": 55,
            "sectionMove": 50,
            "sectionPause": 75,
            "finalMove": 45,
            "stopOffset": 40,
            "tail": 25,
        },
    }
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    print("MANIFEST", out / "manifest.json", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
