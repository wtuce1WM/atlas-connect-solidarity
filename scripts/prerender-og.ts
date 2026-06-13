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
import type { Plugin } from "vite";
import { readFile, writeFile, mkdir } from "node:fs/promises";
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
function rewriteHead(html: string, meta: { title: string; description: string; image: string; url: string }) {
  const t = esc(meta.title);
  const d = esc(meta.description);
  const i = esc(meta.image);
  const u = esc(meta.url);
  return html
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
}

export function prerenderOgPlugin(): Plugin {
  return {
    name: "prerender-og",
    apply: "build",
    async closeBundle() {
      const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
      const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!SUPABASE_URL || !ANON) {
        console.warn("[prerender-og] Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY — skipping.");
        return;
      }

      const distDir = path.resolve(process.cwd(), "dist");
      const indexPath = path.join(distDir, "index.html");
      if (!existsSync(indexPath)) {
        console.warn("[prerender-og] dist/index.html not found — skipping.");
        return;
      }
      const template = await readFile(indexPath, "utf8");

      const headers = { apikey: ANON, Authorization: `Bearer ${ANON}` };

      // Paginate businesses (active only)
      const businesses: BizRow[] = [];
      const PAGE = 1000;
      for (let offset = 0; ; offset += PAGE) {
        const url = `${SUPABASE_URL}/rest/v1/businesses?select=id,slug,name,city,description,hook_fr,images&is_active=eq.true&order=id&limit=${PAGE}&offset=${offset}`;
        const r = await fetch(url, { headers });
        if (!r.ok) throw new Error(`[prerender-og] businesses fetch failed: ${r.status}`);
        const rows = (await r.json()) as BizRow[];
        businesses.push(...rows);
        if (rows.length < PAGE) break;
      }

      // All business vanity URLs
      const vanity: VanityRow[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const url = `${SUPABASE_URL}/rest/v1/vanity_urls?select=slug,target_id&target_type=eq.business&order=target_id&limit=${PAGE}&offset=${offset}`;
        const r = await fetch(url, { headers });
        if (!r.ok) throw new Error(`[prerender-og] vanity fetch failed: ${r.status}`);
        const rows = (await r.json()) as VanityRow[];
        vanity.push(...rows);
        if (rows.length < PAGE) break;
      }

      const byId = new Map(businesses.map((b) => [b.id, b]));
      const vanityById = new Map<string, string>();
      for (const v of vanity) if (byId.has(v.target_id)) vanityById.set(v.target_id, v.slug);

      let written = 0;
      const writeOne = async (slugPath: string, biz: BizRow) => {
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
      }> = [
        {
          path: "blog/fermes-pedagogiques-marrakech",
          title: `Les fermes pédagogiques à Marrakech — ${SITE}`,
          description:
            "Huit adresses à quelques minutes de la ville ocre, pour offrir aux enfants — et aux parents — une vraie journée de nature, entre animaux, ateliers et plantes aromatiques.",
        },
      ];

      let articlesWritten = 0;
      for (const a of staticArticles) {
        const url = `${BASE}/${a.path}`;
        const html = rewriteHead(template, {
          title: a.title,
          description: a.description.substring(0, 200),
          image: a.image || DEFAULT_IMG,
          url,
        });
        const dir = path.join(distDir, a.path);
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, "index.html"), html, "utf8");
        articlesWritten++;
      }

      console.log(`[prerender-og] Wrote ${written} business OG shells + ${articlesWritten} blog article shells.`);

    },
  };
}
