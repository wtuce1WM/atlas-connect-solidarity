/**
 * Vite plugin: Prerender static HTML shells with per-business OpenGraph meta.
 *
 * Why: the site is hosted on Lovable (no edge worker / SSR). Social crawlers
 * (WhatsApp, Facebook, LinkedIn) do not execute JS, so react-helmet-async
 * cannot give them per-route og:image. We generate one tiny HTML file per
 * business at build time so static hosting serves the right meta to bots
 * while humans still hydrate the SPA on top.
 *
 * Output paths:
 *   dist/<vanity-slug>/index.html      (vanity URL — primary share URL)
 *   dist/fiche/<business-slug>/index.html  (legacy /fiche/:slug share URL)
 */
import { loadEnv, type Plugin } from "vite";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const SITE = "ONE WORLD MOROCCO";
const BASE = "https://oneworldmorocco.com";
const DEFAULT_IMG = `${BASE}/images/og-image.jpg`;

interface BizRow {
  id: string;
  slug: string | null;
  name: string;
  city: string | null;
  description: string | null;
  hook_fr: string | null;
  images: string[] | null;
}

interface VanityRow { slug: string; target_id: string }

interface BlogRow {
  slug: string;
  title_fr: string | null;
  excerpt_fr: string | null;
  content_fr: string | null;
  cover_image_url: string | null;
}

function stripHtml(s: string): string {
  return String(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/** Replace OG/Twitter/title/description/canonical tags in the built index.html. */
function rewriteHead(html: string, meta: { title: string; description: string; image: string; url: string; jsonLd?: Record<string, unknown> }) {
  const t = esc(meta.title);
  const d = esc(meta.description);
  const i = esc(meta.image);
  const u = esc(meta.url);
  const withMeta = html
    .replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${d}" />`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${u}" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${t}" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${d}" />`)
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${u}" />`)
    .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${i}" />`)
    .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${t}" />`)
    .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${d}" />`)
    .replace(/<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${i}" />`);

  if (!meta.jsonLd) return withMeta;
  const jsonLd = JSON.stringify(meta.jsonLd).replace(/</g, "\\u003c");
  return withMeta.replace(/<\/head>/, `  <script type="application/ld+json">${jsonLd}</script>\n</head>`);
}

export function prerenderOgPlugin(): Plugin {
  return {
    name: "prerender-og",
    apply: "build",
    async closeBundle() {
      const distDir = path.resolve(process.cwd(), "dist");
      const indexPath = path.join(distDir, "index.html");
      if (!existsSync(indexPath)) {
        console.warn("[prerender-og] dist/index.html not found — skipping.");
        return;
      }
      const template = await readFile(indexPath, "utf8");

      const env = loadEnv(process.env.NODE_ENV || "production", process.cwd(), "");
      const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
      const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const headers = SUPABASE_URL && ANON ? { apikey: ANON, Authorization: `Bearer ${ANON}` } : null;

      // Paginate businesses (active only). If backend env vars are missing,
      // still prerender static article routes below instead of skipping all SEO.
      const businesses: BizRow[] = [];
      const PAGE = 1000;
      if (SUPABASE_URL && headers) {
        for (let offset = 0; ; offset += PAGE) {
          const url = `${SUPABASE_URL}/rest/v1/businesses?select=id,slug,name,city,description,hook_fr,images&is_active=eq.true&order=id&limit=${PAGE}&offset=${offset}`;
          const r = await fetch(url, { headers });
          if (!r.ok) throw new Error(`[prerender-og] businesses fetch failed: ${r.status}`);
          const rows = (await r.json()) as BizRow[];
          businesses.push(...rows);
          if (rows.length < PAGE) break;
        }
      } else {
        console.warn("[prerender-og] Missing backend env vars — skipping business/DB-backed pages, keeping static article prerender.");
      }

      // All business vanity URLs
      const vanity: VanityRow[] = [];
      if (SUPABASE_URL && headers) {
        for (let offset = 0; ; offset += PAGE) {
          const url = `${SUPABASE_URL}/rest/v1/vanity_urls?select=slug,target_id&target_type=eq.business&order=target_id&limit=${PAGE}&offset=${offset}`;
          const r = await fetch(url, { headers });
          if (!r.ok) throw new Error(`[prerender-og] vanity fetch failed: ${r.status}`);
          const rows = (await r.json()) as VanityRow[];
          vanity.push(...rows);
          if (rows.length < PAGE) break;
        }
      }

      const byId = new Map(businesses.map((b) => [b.id, b]));
      const vanityById = new Map<string, string>();
      for (const v of vanity) if (byId.has(v.target_id)) vanityById.set(v.target_id, v.slug);

      // C1 — Ne JAMAIS écraser une page riche déjà produite par
      // scripts/generate-business-og-pages.ts (copiée depuis public/ vers dist/).
      // Ces pages contiennent le JSON-LD complet + le corps textuel SEO ; la
      // coquille légère ci-dessous est un simple fallback.
      const isRichPage = (slugPath: string) =>
        existsSync(path.join(distDir, slugPath, ".og-generated")) ||
        existsSync(path.join(distDir, slugPath, "index.html"));

      let written = 0;
      let preserved = 0;
      const writeOne = async (slugPath: string, biz: BizRow) => {
        if (isRichPage(slugPath)) { preserved++; return; }
        const img = (biz.images && biz.images[0]) || DEFAULT_IMG;
        const rawDesc = biz.hook_fr || biz.description || `Découvrez ${biz.name}.`;
        const title = `${biz.name}${biz.city ? ` – ${biz.city}` : ""} | ${SITE}`;
        const description = stripHtml(rawDesc).substring(0, 160);
        const url = `${BASE}/${slugPath}`;
        const html = rewriteHead(template, { title, description, image: img, url });
        const dir = path.join(distDir, slugPath);
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, "index.html"), html, "utf8");
        written++;
      };


      for (const biz of businesses) {
        const vSlug = vanityById.get(biz.id);
        if (vSlug) await writeOne(vSlug, biz);
        if (biz.slug) await writeOne(`fiche/${biz.slug}`, biz);
      }

      // Static blog articles (custom React pages, not DB-backed).
      // For each one, write a prerendered shell so social crawlers and
      // Google's Rich Results test see the right title/description/og:image
      // without executing JS.
      const staticArticles: Array<{
        path: string;
        title: string;
        description: string;
        image?: string;
        publishedAt: string;
        modifiedAt: string;
      }> = [
        {
          path: "blog/fermes-pedagogiques-marrakech",
          title: `Les fermes pédagogiques à Marrakech — ${SITE}`,
          description:
            "Huit adresses à quelques minutes de la ville ocre, pour offrir aux enfants — et aux parents — une vraie journée de nature, entre animaux, ateliers et plantes aromatiques.",
          publishedAt: "2026-06-12T08:00:00+01:00",
          modifiedAt: "2026-06-13T08:00:00+01:00",
        },
        {
          path: "blog/activites-enfants-marrakech",
          title: `Activités pour les enfants à Marrakech — ${SITE}`,
          description:
            "Notre sélection d'activités et d'adresses pour les enfants à Marrakech : parcs aquatiques, ateliers, kids clubs, restaurants familiaux et plus.",
          publishedAt: "2026-06-12T08:00:00+01:00",
          modifiedAt: "2026-06-13T08:00:00+01:00",
        },
        {
          path: "blog/galeries-art-marrakech",
          title: `Les galeries d'art à Marrakech — ${SITE}`,
          description:
            "Notre sélection de 24 galeries d'art à Marrakech : Guéliz, Médina, Sidi Ghanem et au-delà. Art contemporain, design, photographie et scène picturale marocaine.",
          publishedAt: "2026-06-12T08:00:00+01:00",
          modifiedAt: "2026-06-13T08:00:00+01:00",
        },
        {
          path: "blog/5-jours-marrakech-artisanat",
          title: `5 jours à Marrakech pour découvrir l'artisanat marocain — ${SITE}`,
          description:
            "Itinéraire de 5 jours à Marrakech : 44 adresses sélectionnées (Guéliz, Médina, Sidi Ghanem) pour découvrir le meilleur de l'artisanat marocain.",
          publishedAt: "2026-06-12T08:00:00+01:00",
          modifiedAt: "2026-06-13T08:00:00+01:00",
        },
        {
          path: "blog/essaouira-vue-mer",
          title: `Les adresses avec vue sur mer à Essaouira — ${SITE}`,
          description:
            "Notre sélection des meilleures adresses face à l'océan à Essaouira : hôtels, restaurants, cafés et rooftops pour profiter de la brise atlantique.",
          publishedAt: "2026-06-12T08:00:00+01:00",
          modifiedAt: "2026-06-13T08:00:00+01:00",
        },
      ];

      let articlesWritten = 0;
      let articlesPreserved = 0;
      const writeArticle = async (slugPath: string, title: string, description: string, image?: string, dates?: { publishedAt?: string; modifiedAt?: string }) => {
        // C1 — ne pas écraser une page riche déjà générée dans public/ → dist/
        if (isRichPage(slugPath)) { articlesPreserved++; return; }
        const url = `${BASE}/${slugPath}`;

        const cleanTitle = title.replace(` — ${SITE}`, "").replace(` | ${SITE}`, "");
        const cleanDescription = stripHtml(description).substring(0, 200);
        const articleImage = image || DEFAULT_IMG;
        const html = rewriteHead(template, {
          title,
          description: cleanDescription,
          image: articleImage,
          url,
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: cleanTitle,
            description: cleanDescription,
            image: [articleImage],
            datePublished: dates?.publishedAt || new Date().toISOString(),
            dateModified: dates?.modifiedAt || dates?.publishedAt || new Date().toISOString(),
            author: { "@type": "Organization", name: SITE, url: BASE },
            publisher: { "@type": "Organization", name: SITE, logo: { "@type": "ImageObject", url: DEFAULT_IMG } },
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
          },
        });
        // Écrit slugPath/index.html (et nettoie l'ancien fichier sans extension qui était téléchargé)
        const legacy = path.join(distDir, slugPath);
        await rm(legacy, { recursive: true, force: true });
        const dir = path.join(distDir, slugPath);
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, "index.html"), html, "utf8");
        articlesWritten++;
      };

      for (const a of staticArticles) {
        await writeArticle(a.path, a.title, a.description, a.image, { publishedAt: a.publishedAt, modifiedAt: a.modifiedAt });
      }

      // DB-backed blog posts — fully dynamic, no code edit needed when a new article is published.
      const blogPosts: BlogRow[] = [];
      if (SUPABASE_URL && headers) {
        for (let offset = 0; ; offset += PAGE) {
          const url = `${SUPABASE_URL}/rest/v1/blog_posts?select=slug,title_fr,excerpt_fr,content_fr,cover_image_url&is_published=eq.true&order=slug&limit=${PAGE}&offset=${offset}`;
          const r = await fetch(url, { headers });
          if (!r.ok) { console.warn(`[prerender-og] blog_posts fetch failed: ${r.status}`); break; }
          const rows = (await r.json()) as BlogRow[];
          blogPosts.push(...rows);
          if (rows.length < PAGE) break;
        }
      }
      const staticSlugs = new Set(staticArticles.map((a) => a.path.replace(/^blog\//, "")));
      for (const post of blogPosts) {
        if (!post.slug || staticSlugs.has(post.slug)) continue; // custom React page wins
        const title = `${post.title_fr || "Article"} — ${SITE}`;
        const description =
          post.excerpt_fr ||
          (post.content_fr ? stripHtml(post.content_fr).substring(0, 200) : `Article du blog ${SITE}.`);
        await writeArticle(`blog/${post.slug}`, title, description, post.cover_image_url || undefined);
      }

      console.log(
        `[prerender-og] Fallback shells écrites: ${written} business + ${articlesWritten} articles. ` +
          `Pages riches préservées (générateur public/): ${preserved} business + ${articlesPreserved} articles.`,
      );



    },
  };
}
