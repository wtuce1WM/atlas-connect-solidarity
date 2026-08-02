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
  computed_rating: number | null;
  total_review_count: number | null;
  latitude: number | null;
  longitude: number | null;
}

interface DefaultReview {
  author_name: string | null;
  rating: number | null;
  source: string | null;
  text: string | null;
  text_fr: string | null;
  text_en: string | null;
  text_ar: string | null;
}

const BIZ_FIELDS =
  "id, name, slug, city, neighborhood, images, min_price, manual_price_range, computed_rating, total_review_count, latitude, longitude";

const distanceKm = (
  aLat?: number | null,
  aLng?: number | null,
  bLat?: number | null,
  bLng?: number | null,
) => {
  if (aLat == null || aLng == null || bLat == null || bLng == null) return null;
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

const formatDistance = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`;

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
  const [reviewMap, setReviewMap] = useState<Record<string, DefaultReview>>({});
  const [owner, setOwner] = useState<Biz | null>(null);
  const [copied, setCopied] = useState(false);
  const [mapBg, setMapBg] = useState("");

  // Établissement propriétaire (référence pour les distances)
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("businesses").select(BIZ_FIELDS).eq("id", businessId).maybeSingle();
      if (!cancelled && data) setOwner(data as unknown as Biz);
    })();
    return () => { cancelled = true; };
  }, [businessId]);


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
        .select(BIZ_FIELDS)
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

  // Avis « Par défaut » (sinon le mieux noté) de chaque établissement de l'article
  useEffect(() => {
    const ids = entries.map((e) => e.id).filter(Boolean);
    const missing = ids.filter((id) => !(id in reviewMap));
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("reviews")
        .select("business_id, author_name, rating, source, text, text_fr, text_en, text_ar, is_default")
        .in("business_id", missing)
        .eq("is_hidden", false)
        .order("is_default", { ascending: false })
        .order("rating", { ascending: false, nullsFirst: false })
        .limit(500);
      if (cancelled) return;
      setReviewMap((prev) => {
        const next = { ...prev };
        missing.forEach((id) => { next[id] = next[id] ?? (null as unknown as DefaultReview); });
        ((data as any[]) || []).forEach((r) => {
          if (!next[r.business_id]) next[r.business_id] = r as DefaultReview;
        });
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [entries, reviewMap]);


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

    const panelItems: { slug: string; url: string; page: string; title: string }[] = [];

    const blocks = entries
      .map((e) => {
        const b = bizMap[e.id];
        const gallery = (b?.images || []).filter(Boolean).map((u) => abs(u)).slice(0, 12);
        const link = b?.slug ? `${SITE}/${b.slug}` : canonical;
        // Mode lecture identique au panneau de droite des articles /blog
        const panelUrl = b?.slug
          ? `${SITE}/embed/fiche/${b.slug}?lang=${lang}`
          : canonical;
        const title = e.title || b?.name || "";
        const idx = panelItems.length;
        panelItems.push({ slug: b?.slug || "", url: panelUrl, page: link, title });
        const dataAttrs = `data-owm-panel="${idx}" onclick="return window.owmOpenPanel?window.owmOpenPanel(${idx}):true"`;

        const place = [b?.neighborhood, b?.city].filter(Boolean).join(" · ");
        const rankBadge =
          e.rank && e.rank >= 1 && e.rank <= 3
            ? `<span style="display:inline-block;padding:4px 12px;margin-right:10px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;background:linear-gradient(135deg,#F4CF7A,#D4AF37 55%,#8A6A1A);color:#111">${medal(e.rank)} N°${e.rank}</span>`
            : "";

        // Badge avis clients : note /20 + nombre d'avis
        const rating20 = b?.computed_rating && b.computed_rating > 0 ? b.computed_rating : null;
        const reviewCount = b?.total_review_count && b.total_review_count > 0 ? b.total_review_count : null;
        const reviewsBadge =
          rating20 || reviewCount
            ? `<span style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;font-size:13px;font-weight:700;background:rgba(253,246,227,.92);border:1px solid #e6cf8a;color:#8A6A1A">★ ${
                rating20 ? `${rating20}<span style="font-weight:600;color:#a1874a">/20</span>` : "—"
              }${reviewCount ? `<span style="font-weight:500;color:#6b7280">· ${reviewCount.toLocaleString("fr-FR")} avis</span>` : ""}</span>`
            : "";

        // Distance par rapport à l'établissement propriétaire
        const dKm =
          owner && b && owner.id !== b.id
            ? distanceKm(owner.latitude, owner.longitude, b.latitude, b.longitude)
            : null;
        const distanceBadge =
          dKm != null
            ? `<span style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;font-size:13px;font-weight:600;background:rgba(255,255,255,.9);border:1px solid rgba(255,255,255,.5);color:#0f172a">📍 ${formatDistance(
                dKm,
              )} de ${esc(owner!.name)}</span>`
            : "";
        const metaRow =
          reviewsBadge || distanceBadge
            ? `<p style="margin:0 0 10px;display:flex;flex-wrap:wrap;gap:8px">${reviewsBadge}${distanceBadge}</p>`
            : "";

        // Sur-impression affichée uniquement sur la 1ère image
        const overlay = `<div data-owm-overlay style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:20px;background:linear-gradient(to top,rgba(0,0,0,.85) 0%,rgba(0,0,0,.45) 45%,rgba(0,0,0,.05) 100%);transition:opacity .25s;pointer-events:none">
        <div style="pointer-events:auto;text-shadow:0 1px 3px rgba(0,0,0,.6)">
          ${e.pretitle ? `<p style="margin:0 0 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#F4CF7A">${esc(e.pretitle)}</p>` : ""}
          ${place ? `<p style="margin:0 0 4px;font-size:13px;color:rgba(255,255,255,.85)">${esc(place)}</p>` : ""}
          <h2 style="margin:0 0 10px;font-size:26px;line-height:1.25;font-family:Montserrat,Helvetica,Arial,sans-serif;color:#fff">${rankBadge}<a href="${link}" ${dataAttrs} rel="noopener" style="color:#fff;text-decoration:none">${esc(title)}</a></h2>
          ${metaRow}
          ${e.hook ? `<p style="margin:0;font-style:italic;font-size:16px;line-height:1.5;color:#fff">« ${esc(e.hook)} »</p>` : ""}
        </div>
      </div>`;

        const slides = gallery
          .map(
            (u, k) =>
              `<div style="position:relative;flex:0 0 100%;width:100%;height:100%"><img src="${u}" alt="${esc(title)}" loading="${k === 0 ? "eager" : "lazy"}" style="width:100%;height:100%;object-fit:cover;display:block" />${k === 0 ? overlay : ""}</div>`,
          )
          .join("");

        const arrows =
          gallery.length > 1
            ? `<button type="button" data-owm-dir="-1" aria-label="Image précédente" style="position:absolute;top:50%;left:10px;transform:translateY(-50%);width:38px;height:38px;border:0;border-radius:999px;background:rgba(255,255,255,.92);color:#0f172a;font-size:18px;line-height:1;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25)">‹</button>
        <button type="button" data-owm-dir="1" aria-label="Image suivante" style="position:absolute;top:50%;right:10px;transform:translateY(-50%);width:38px;height:38px;border:0;border-radius:999px;background:rgba(255,255,255,.92);color:#0f172a;font-size:18px;line-height:1;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25)">›</button>
        <div data-owm-count style="position:absolute;top:10px;right:12px;padding:3px 10px;border-radius:999px;background:rgba(0,0,0,.5);color:#fff;font-size:12px">1/${gallery.length}</div>`
            : "";

        const carousel = gallery.length
          ? `<div data-owm-carousel style="position:relative;width:100%;height:420px;max-height:70vh;overflow:hidden;border-radius:16px;margin:0 0 18px;background:#0f172a">
        <div data-owm-track style="display:flex;width:100%;height:100%;transition:transform .35s ease">${slides}</div>
        ${arrows}
      </div>`
          : "";

        const rv = reviewMap[e.id];
        const rvText = rv
          ? (lang === "ar"
              ? rv.text_ar || rv.text_fr || rv.text_en || rv.text
              : lang === "en"
                ? rv.text_en || rv.text_fr || rv.text
                : rv.text_fr || rv.text) || ""
          : "";
        const sourceLabel = (rv?.source || "")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        const reviewBlock = rvText.trim()
          ? `<blockquote style="margin:0 0 14px;padding:14px 16px;border-left:3px solid #D4AF37;background:#fbfaf7;border-radius:0 12px 12px 0">
        <p style="margin:0 0 8px;font-size:15px;line-height:1.65;color:#374151">« ${esc(
          rvText.length > 600 ? `${rvText.slice(0, 600)}…` : rvText,
        )} »</p>
        <p style="margin:0;font-size:13px;color:#6b7280">${esc(rv.author_name || "Client")}${
          rv.rating ? ` · ${rv.rating}/5` : ""
        }${sourceLabel ? ` · ${esc(sourceLabel)}` : ""}</p>
      </blockquote>`
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
      ${carousel}
      ${!gallery.length ? `<h2 style="margin:0 0 10px;font-size:26px;line-height:1.25;font-family:Montserrat,Helvetica,Arial,sans-serif;color:#0f172a">${rankBadge}<a href="${link}" ${dataAttrs} rel="noopener" style="color:inherit;text-decoration:none">${esc(title)}</a></h2>${place ? `<p style="margin:0 0 8px;font-size:14px;color:#6b7280">${esc(place)}</p>` : ""}${e.hook ? `<p style="margin:0 0 10px;font-style:italic;font-size:17px;color:#b45309">« ${esc(e.hook)} »</p>` : ""}` : ""}
      ${e.hours ? `<p style="margin:0 0 10px;font-size:14px;color:#6b7280">${esc(e.hours)}</p>` : ""}
      ${price}
      ${paras}
      ${reviewBlock}

      <p style="margin:16px 0 0"><a href="${link}" ${dataAttrs} rel="noopener" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#0f172a;color:#fff;font-size:14px;text-decoration:none">Voir la fiche sur One World Morocco</a></p>
    </article>`;
      })
      .join("\n");


    const panelScript = `<!-- One World Morocco — panneau latéral (swipe vertical + horizontal) -->
<div id="owm-panel" aria-hidden="true" style="position:fixed;inset:0;z-index:2147483000;display:none">
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
      <div id="owm-panel-swipe" style="position:absolute;top:56px;left:0;bottom:0;width:44px;touch-action:none;cursor:ns-resize"></div>
    </div>
  </div>
</div>
<script>
(function(){
  var SITE=${JSON.stringify(SITE)};
  var LANG=${JSON.stringify(lang)};
  var items=${JSON.stringify(panelItems)};
  var root=document.getElementById('owm-panel');
  if(!root) return;
  var sheet=document.getElementById('owm-panel-sheet'),bd=document.getElementById('owm-panel-backdrop'),frame=document.getElementById('owm-panel-frame'),ttl=document.getElementById('owm-panel-title'),openLink=document.getElementById('owm-panel-open'),swipe=document.getElementById('owm-panel-swipe');
  var i=0,isOpen=false;
  function slugFromHref(href){
    try{
      var u=new URL(href, location.href);
      if(u.hostname.indexOf('oneworldmorocco')===-1) return null;
      var parts=u.pathname.split('/').filter(Boolean);
      if(!parts.length) return null;
      if(parts[0]==='embed'||parts[0]==='blog') return null;
      return parts[parts.length-1];
    }catch(e){return null;}
  }
  function indexForSlug(slug){
    for(var k=0;k<items.length;k++){ if(items[k].slug===slug) return k; }
    items.push({slug:slug,url:SITE+'/embed/fiche/'+slug+'?lang='+LANG,page:SITE+'/'+slug,title:slug});
    return items.length-1;
  }
  function render(){var it=items[i];if(!it)return;frame.src=it.url;ttl.textContent=(i+1)+'/'+items.length+' · '+it.title;openLink.href=it.page||it.url;}
  function open(n){i=n;isOpen=true;root.style.display='block';root.setAttribute('aria-hidden','false');render();requestAnimationFrame(function(){bd.style.opacity='1';sheet.style.transform='translateX(0)';});document.documentElement.style.overflow='hidden';}
  function close(){isOpen=false;bd.style.opacity='0';sheet.style.transform='translateX(100%)';document.documentElement.style.overflow='';setTimeout(function(){root.style.display='none';root.setAttribute('aria-hidden','true');frame.src='about:blank';},300);}
  function go(d){var n=i+d;if(n<0||n>=items.length)return;i=n;render();}
  window.owmOpenPanel=function(n){open(parseInt(n,10)||0);return false;};
  // Interception en phase de capture : fonctionne même si le CMS retire les attributs data-*.
  document.addEventListener('click',function(ev){
    var t=ev.target;
    var a=t&&t.closest?t.closest('a'):null;
    if(!a||root.contains(a))return;
    var idxAttr=a.getAttribute('data-owm-panel');
    var n=null;
    if(idxAttr!==null&&idxAttr!==''){ n=parseInt(idxAttr,10)||0; }
    else { var slug=slugFromHref(a.getAttribute('href')||''); if(slug) n=indexForSlug(slug); }
    if(n===null)return;
    ev.preventDefault();ev.stopPropagation();
    open(n);
  },true);
  document.getElementById('owm-panel-close').addEventListener('click',close);
  bd.addEventListener('click',close);
  document.getElementById('owm-panel-prev').addEventListener('click',function(){go(-1);});
  document.getElementById('owm-panel-next').addEventListener('click',function(){go(1);});
  document.addEventListener('keydown',function(e){if(!isOpen)return;if(e.key==='Escape')close();else if(e.key==='ArrowDown'){e.preventDefault();go(1);}else if(e.key==='ArrowUp'){e.preventDefault();go(-1);}});
  var x=null,y=null,done=false;
  swipe.addEventListener('touchstart',function(e){x=e.touches[0].clientX;y=e.touches[0].clientY;done=false;},{passive:true});
  swipe.addEventListener('touchmove',function(e){
    if(y===null||done)return;
    var dy=e.touches[0].clientY-y, dx=e.touches[0].clientX-x;
    if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>60){done=true;go(dy<0?1:-1);}
    else if(Math.abs(dx)>70){done=true;if(dx>0)close();}
  },{passive:true});
  swipe.addEventListener('touchend',function(){x=null;y=null;});
  swipe.addEventListener('wheel',function(e){if(Math.abs(e.deltaY)<30)return;e.preventDefault();go(e.deltaY>0?1:-1);},{passive:false});
})();
(function(){
  // Carrousels d'images (chevrons ‹ ›) — sur-impression visible seulement sur la 1ère image
  var list=document.querySelectorAll('[data-owm-carousel]');
  for(var n=0;n<list.length;n++){(function(box){
    var track=box.querySelector('[data-owm-track]');
    if(!track)return;
    var slides=track.children.length, i=0;
    var counter=box.querySelector('[data-owm-count]');
    var overlay=box.querySelector('[data-owm-overlay]');
    function render(){
      track.style.transform='translateX(-'+(i*100)+'%)';
      if(counter)counter.textContent=(i+1)+'/'+slides;
      if(overlay)overlay.style.opacity=(i===0?'1':'0');
    }
    var btns=box.querySelectorAll('[data-owm-dir]');
    for(var k=0;k<btns.length;k++){(function(btn){
      btn.addEventListener('click',function(ev){
        ev.preventDefault();ev.stopPropagation();
        var d=parseInt(btn.getAttribute('data-owm-dir'),10)||1;
        i=(i+d+slides)%slides;render();
      });
    })(btns[k]);}
    var sx=null,sy=null,hd=false;
    box.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;sy=e.touches[0].clientY;hd=false;},{passive:true});
    box.addEventListener('touchmove',function(e){
      if(sx===null||hd)return;
      var dx=e.touches[0].clientX-sx, dy=e.touches[0].clientY-sy;
      if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){hd=true;i=(i+(dx<0?1:-1)+slides)%slides;render();}
    },{passive:true});
    box.addEventListener('touchend',function(){sx=null;sy=null;});
    render();
  })(list[n]);}
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
  }, [post, entries, bizMap, reviewMap, owner, lang, articleTitle, intro, businessName]);


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
