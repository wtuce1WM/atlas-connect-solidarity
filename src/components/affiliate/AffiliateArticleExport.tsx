import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Copy, Check, Download, FileText, Loader2, ExternalLink } from "lucide-react";

const SITE = "https://oneworldmorocco.com";

type Lang = "fr" | "en" | "ar";

interface Entry {
  id: string;
  pretitle?: string;
  title?: string;
  hook?: string | null;
  hours?: string | null;
  rank?: number | null;
  paragraphs?: string[];
}

interface Post {
  id: string;
  slug: string;
  title_fr: string;
  title_en: string | null;
  title_ar: string | null;
  intro_fr: string | null;
  intro_en: string | null;
  intro_ar: string | null;
  entries_fr: any;
  entries_en: any;
  entries_ar: any;
  cover_image_url: string | null;
  custom_hero_image_url: string | null;
  is_published: boolean;
}

interface Biz {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  neighborhood: string | null;
  images: string[] | null;
  min_price: number | null;
  manual_price_range: string | null;
}

const abs = (url?: string | null) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE}${url.startsWith("/") ? "" : "/"}${url}`;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface Props {
  businessId: string | null;
  businessName: string;
}

const AffiliateArticleExport = ({ businessId, businessName }: Props) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");
  const [lang, setLang] = useState<Lang>("fr");
  const [bizMap, setBizMap] = useState<Record<string, Biz>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!businessId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("blog_posts")
        .select(
          "id, slug, title_fr, title_en, title_ar, intro_fr, intro_en, intro_ar, entries_fr, entries_en, entries_ar, cover_image_url, custom_hero_image_url, is_published"
        )
        .eq("anchor_business_id", businessId)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      const list = (data ?? []) as unknown as Post[];
      setPosts(list);
      setSelectedId(list[0]?.id ?? "");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  const post = posts.find((p) => p.id === selectedId) ?? null;

  const entries: Entry[] = useMemo(() => {
    if (!post) return [];
    const raw =
      (lang === "en" ? post.entries_en : lang === "ar" ? post.entries_ar : post.entries_fr) ||
      post.entries_fr ||
      [];
    return Array.isArray(raw) ? (raw as Entry[]) : [];
  }, [post, lang]);

  useEffect(() => {
    const ids = entries.map((e) => e.id).filter(Boolean);
    const missing = ids.filter((id) => !bizMap[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, slug, city, neighborhood, images, min_price, manual_price_range")
        .in("id", missing);
      if (cancelled || !data) return;
      setBizMap((prev) => {
        const next = { ...prev };
        (data as unknown as Biz[]).forEach((b) => { next[b.id] = b; });
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [entries, bizMap]);

  const articleTitle = post
    ? (lang === "en" ? post.title_en : lang === "ar" ? post.title_ar : post.title_fr) || post.title_fr
    : "";
  const intro = post
    ? (lang === "en" ? post.intro_en : lang === "ar" ? post.intro_ar : post.intro_fr) || ""
    : "";

  const html = useMemo(() => {
    if (!post) return "";
    const dir = lang === "ar" ? ' dir="rtl"' : "";
    const canonical = `${SITE}/blog/${post.slug}`;
    const hero = abs(post.custom_hero_image_url || post.cover_image_url);
    const medal = (r?: number | null) => (r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : "");

    const panelItems: { url: string; page: string; title: string }[] = [];

    const blocks = entries
      .map((e) => {
        const b = bizMap[e.id];
        const img = abs(b?.images?.[0]);
        const link = b?.slug ? `${SITE}/${b.slug}` : canonical;
        // Mode lecture identique au panneau de droite des articles /blog
        const panelUrl = b?.slug
          ? `${SITE}/embed/fiche/${b.slug}?lang=${lang}`
          : canonical;
        const title = e.title || b?.name || "";
        const idx = panelItems.length;
        panelItems.push({ url: panelUrl, page: link, title });
        const dataAttrs = `data-owm-panel="${idx}"`;

        const place = [b?.neighborhood, b?.city].filter(Boolean).join(" · ");
        const rankBadge = e.rank
          ? `<span style="display:inline-block;padding:4px 12px;margin-right:10px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;background:linear-gradient(135deg,#F4CF7A,#D4AF37 55%,#8A6A1A);color:#111">${medal(e.rank)} N°${e.rank}</span>`
          : "";
        const price =
          b?.min_price && b.min_price > 0
            ? `<p style="margin:0 0 10px;font-size:14px;color:#6b7280">Prix minimum constaté en réservation directe : <strong>${Math.round(b.min_price)} €</strong></p>`
            : b?.manual_price_range
              ? `<p style="margin:0 0 10px;font-size:14px;color:#6b7280">${esc(b.manual_price_range)}</p>`
              : "";
        const paras = (e.paragraphs ?? [])
          .map((p) => `<p style="margin:0 0 14px;line-height:1.7;color:#1f2937">${esc(p)}</p>`)
          .join("\n        ");
        return `    <article style="margin:0 0 44px;padding:0 0 32px;border-bottom:1px solid #e5e7eb">
      ${img ? `<img src="${img}" alt="${esc(title)}" loading="lazy" style="width:100%;height:auto;max-height:460px;object-fit:cover;border-radius:16px;margin:0 0 18px" />` : ""}
      ${e.pretitle ? `<p style="margin:0 0 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#b45309">${esc(e.pretitle)}</p>` : ""}
      <h2 style="margin:0 0 10px;font-size:26px;line-height:1.25;font-family:Montserrat,Helvetica,Arial,sans-serif;color:#0f172a">${rankBadge}<a href="${link}" ${dataAttrs} target="_blank" rel="noopener" style="color:inherit;text-decoration:none">${esc(title)}</a></h2>
      ${place ? `<p style="margin:0 0 8px;font-size:14px;color:#6b7280">${esc(place)}</p>` : ""}
      ${e.hook ? `<p style="margin:0 0 10px;font-style:italic;font-size:17px;color:#b45309">« ${esc(e.hook)} »</p>` : ""}
      ${e.hours ? `<p style="margin:0 0 10px;font-size:14px;color:#6b7280">${esc(e.hours)}</p>` : ""}
      ${price}
      ${paras}
      <p style="margin:16px 0 0"><a href="${link}" ${dataAttrs} target="_blank" rel="noopener" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#0f172a;color:#fff;font-size:14px;text-decoration:none">Voir la fiche sur One World Morocco</a></p>
    </article>`;
      })
      .join("\n");

    const panelScript = `<!-- One World Morocco — panneau latéral (swipe vertical) -->
<div id="owm-panel" aria-hidden="true" style="position:fixed;inset:0;z-index:99999;display:none">
  <div id="owm-panel-backdrop" style="position:absolute;inset:0;background:rgba(0,0,0,.55);opacity:0;transition:opacity .25s"></div>
  <div id="owm-panel-sheet" style="position:absolute;top:0;right:0;bottom:0;width:100%;max-width:560px;background:#0f172a;box-shadow:-12px 0 40px rgba(0,0,0,.35);display:flex;flex-direction:column;transform:translateX(100%);transition:transform .3s ease">
    <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(0,0,0,.5);color:#fff;font-family:Avenir,'Nunito Sans',Helvetica,Arial,sans-serif">
      <button id="owm-panel-prev" aria-label="Précédent" style="width:34px;height:34px;border:0;border-radius:999px;background:rgba(255,255,255,.12);color:#fff;font-size:15px;cursor:pointer">▲</button>
      <button id="owm-panel-next" aria-label="Suivant" style="width:34px;height:34px;border:0;border-radius:999px;background:rgba(255,255,255,.12);color:#fff;font-size:15px;cursor:pointer">▼</button>
      <div id="owm-panel-title" style="flex:1;min-width:0;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>
      <a id="owm-panel-open" href="#" target="_blank" rel="noopener" style="font-size:12px;color:#D4AF37;text-decoration:none">Nouvel onglet</a>
      <button id="owm-panel-close" aria-label="Fermer" style="width:34px;height:34px;border:0;border-radius:999px;background:rgba(255,255,255,.12);color:#fff;font-size:16px;cursor:pointer">✕</button>
    </div>
    <div id="owm-panel-body" style="position:relative;flex:1;background:#0f172a">
      <iframe id="owm-panel-frame" title="One World Morocco" style="width:100%;height:100%;border:0;display:block" allow="geolocation"></iframe>
      <div id="owm-panel-swipe" style="position:absolute;top:0;left:0;bottom:0;width:56px;touch-action:none;cursor:ns-resize"></div>
    </div>
  </div>
</div>
<script>
(function(){
  var items = ${JSON.stringify(panelItems)};
  if(!items.length) return;
  var root=document.getElementById('owm-panel'),sheet=document.getElementById('owm-panel-sheet'),bd=document.getElementById('owm-panel-backdrop'),frame=document.getElementById('owm-panel-frame'),ttl=document.getElementById('owm-panel-title'),openLink=document.getElementById('owm-panel-open'),swipe=document.getElementById('owm-panel-swipe');
  var i=0,isOpen=false;
  function render(){var it=items[i];if(!it)return;frame.src=it.url;ttl.textContent=(i+1)+'/'+items.length+' · '+it.title;openLink.href=it.url;}
  function open(n){i=n;isOpen=true;root.style.display='block';root.setAttribute('aria-hidden','false');render();requestAnimationFrame(function(){bd.style.opacity='1';sheet.style.transform='translateX(0)';});document.documentElement.style.overflow='hidden';}
  function close(){isOpen=false;bd.style.opacity='0';sheet.style.transform='translateX(100%)';document.documentElement.style.overflow='';setTimeout(function(){root.style.display='none';root.setAttribute('aria-hidden','true');frame.src='about:blank';},300);}
  function go(d){var n=i+d;if(n<0||n>=items.length)return;i=n;render();}
  document.addEventListener('click',function(ev){var a=ev.target&&ev.target.closest?ev.target.closest('[data-owm-panel]'):null;if(!a)return;ev.preventDefault();open(parseInt(a.getAttribute('data-owm-panel'),10)||0);});
  document.getElementById('owm-panel-close').addEventListener('click',close);
  bd.addEventListener('click',close);
  document.getElementById('owm-panel-prev').addEventListener('click',function(){go(-1);});
  document.getElementById('owm-panel-next').addEventListener('click',function(){go(1);});
  document.addEventListener('keydown',function(e){if(!isOpen)return;if(e.key==='Escape')close();else if(e.key==='ArrowDown'){e.preventDefault();go(1);}else if(e.key==='ArrowUp'){e.preventDefault();go(-1);}});
  var y=null,done=false;
  swipe.addEventListener('touchstart',function(e){y=e.touches[0].clientY;done=false;},{passive:true});
  swipe.addEventListener('touchmove',function(e){if(y===null||done)return;var dy=e.touches[0].clientY-y;if(Math.abs(dy)>70){done=true;go(dy<0?1:-1);y=null;}},{passive:true});
  swipe.addEventListener('touchend',function(){y=null;});
  swipe.addEventListener('wheel',function(e){if(Math.abs(e.deltaY)<30)return;e.preventDefault();go(e.deltaY>0?1:-1);},{passive:false});
})();
</script>`;

    return `<!-- Article One World Morocco — ${esc(articleTitle)} -->
<!-- Source : ${canonical} — médias hébergés par One World Morocco -->
<section${dir} style="max-width:820px;margin:0 auto;padding:24px;font-family:Avenir,'Nunito Sans',Helvetica,Arial,sans-serif;color:#1f2937;background:#fff">
  <header style="margin:0 0 32px">
    ${hero ? `<img src="${hero}" alt="${esc(articleTitle)}" style="width:100%;height:auto;max-height:520px;object-fit:cover;border-radius:20px;margin:0 0 20px" />` : ""}
    <h1 style="margin:0 0 14px;font-size:34px;line-height:1.2;font-family:Montserrat,Helvetica,Arial,sans-serif;color:#0f172a">${esc(articleTitle)}</h1>
    ${intro ? `<p style="margin:0;font-size:18px;line-height:1.7">${esc(intro)}</p>` : ""}
  </header>
${blocks}
  <footer style="margin:8px 0 0;font-size:14px;color:#6b7280">
    Article publié par <a href="${canonical}" target="_blank" rel="noopener" style="color:#b45309">One World Morocco</a> — ${esc(businessName)}.
  </footer>
</section>
${panelScript}`;
  }, [post, entries, bizMap, lang, articleTitle, intro, businessName]);


  const copy = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast({ title: "Code de l'article copié" });
    } catch {
      toast({ title: "Copie impossible", variant: "destructive" });
    }
  };

  const download = () => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${post?.slug ?? "article"}-${lang}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/70">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de vos articles…
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-sm text-white/70">
        Aucun article de blog n'est rattaché à {businessName} pour le moment.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-white/80">Article</Label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
          >
            {posts.map((p) => (
              <option key={p.id} value={p.id} className="text-black">
                {p.title_fr}
                {p.is_published ? "" : " (brouillon)"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-white/80">Langue</Label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
          >
            <option value="fr" className="text-black">Français</option>
            <option value="en" className="text-black">English</option>
            <option value="ar" className="text-black">العربية</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-white/15 bg-black/30 p-3">
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed text-white/70">
          {html}
        </pre>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={copy} className="gap-2">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Copier le code de l'article
        </Button>
        <Button variant="outline" onClick={download} className="gap-2 text-white">
          <Download className="h-4 w-4" /> Télécharger .html
        </Button>
        {post && (
          <Button variant="outline" asChild className="gap-2 text-white">
            <a href={`${SITE}/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" /> Voir l'article
            </a>
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70 space-y-1">
        <p className="flex items-center gap-1.5 font-semibold text-white/85">
          <FileText className="h-3.5 w-3.5" /> Où coller ce code
        </p>
        <p>
          Wix : Éditeur → <em>Ajouter</em> → <em>Intégrer</em> → <em>Code HTML</em>. WordPress : bloc
          « HTML personnalisé ». Squarespace : bloc « Code ». Webflow : composant « Embed ».
        </p>
        <p>
          Le code est autonome (styles en ligne + un petit script inclus). Les liens des
          établissements ouvrent un <strong>panneau latéral à droite</strong> avec navigation par
          swipe vertical (ou flèches ↑/↓) entre les établissements de l'article — comme sur
          oneworldmorocco.com. Rien à installer en plus : le script est déjà dans le code copié.
          Sur les plateformes qui bloquent les scripts dans un bloc HTML (certains éditeurs), colle
          le bloc <code>&lt;script&gt;</code> final dans le « Custom Code / Body - end » du site.
        </p>
        <p>
          Les images et vidéos restent hébergées par One World Morocco : elles se mettent à jour
          automatiquement et ne consomment pas votre stockage.
        </p>

      </div>
    </div>
  );
};

export default AffiliateArticleExport;
