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

    const blocks = entries
      .map((e) => {
        const b = bizMap[e.id];
        const img = abs(b?.images?.[0]);
        const link = b?.slug ? `${SITE}/${b.slug}` : canonical;
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
      ${img ? `<img src="${img}" alt="${esc(e.title || b?.name || "")}" loading="lazy" style="width:100%;height:auto;max-height:460px;object-fit:cover;border-radius:16px;margin:0 0 18px" />` : ""}
      ${e.pretitle ? `<p style="margin:0 0 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#b45309">${esc(e.pretitle)}</p>` : ""}
      <h2 style="margin:0 0 10px;font-size:26px;line-height:1.25;font-family:Montserrat,Helvetica,Arial,sans-serif;color:#0f172a">${rankBadge}<a href="${link}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">${esc(e.title || b?.name || "")}</a></h2>
      ${place ? `<p style="margin:0 0 8px;font-size:14px;color:#6b7280">${esc(place)}</p>` : ""}
      ${e.hook ? `<p style="margin:0 0 10px;font-style:italic;font-size:17px;color:#b45309">« ${esc(e.hook)} »</p>` : ""}
      ${e.hours ? `<p style="margin:0 0 10px;font-size:14px;color:#6b7280">${esc(e.hours)}</p>` : ""}
      ${price}
      ${paras}
      <p style="margin:16px 0 0"><a href="${link}" target="_blank" rel="noopener" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#0f172a;color:#fff;font-size:14px;text-decoration:none">Voir la fiche sur One World Morocco</a></p>
    </article>`;
      })
      .join("\n");

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
</section>`;
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
          Le code est autonome (styles en ligne, aucun script). Les images et vidéos restent hébergées
          par One World Morocco : elles se mettent à jour automatiquement et ne consomment pas votre
          stockage. Les liens pointent vers les fiches sur oneworldmorocco.com.
        </p>
      </div>
    </div>
  );
};

export default AffiliateArticleExport;
