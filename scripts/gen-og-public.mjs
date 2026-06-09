#!/usr/bin/env node
/**
 * One-off generator: writes static per-business HTML shells into public/
 * so that Lovable hosting serves the right OG meta to social crawlers.
 *
 *   node scripts/gen-og-public.mjs           # add only missing files
 *   node scripts/gen-og-public.mjs --force   # regenerate everything
 *
 * Reads VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY from .env.
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const FORCE = process.argv.includes("--force");
const SITE = "ONE WORLD MOROCCO";
const BASE = "https://oneworldmorocco.com";
const DEFAULT_IMG = `${BASE}/images/og-image.jpg`;
const ROOT = process.cwd();

// --- read .env
const env = Object.fromEntries(
  (await readFile(path.join(ROOT, ".env"), "utf8"))
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
const SUPA = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!SUPA || !ANON) throw new Error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY");

const headers = { apikey: ANON, Authorization: `Bearer ${ANON}` };

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const stripHtml = (s) =>
  String(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

async function pageAll(table, qs) {
  const out = [];
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const url = `${SUPA}/rest/v1/${table}?${qs}&limit=${PAGE}&offset=${offset}`;
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`${table} ${r.status}: ${await r.text()}`);
    const rows = await r.json();
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

const [businesses, vanity] = await Promise.all([
  pageAll("businesses", "select=id,slug,name,city,description,hook_fr,images&is_active=eq.true&order=id"),
  pageAll("vanity_urls", "select=slug,target_id&target_type=eq.business&order=target_id"),
]);

const byId = new Map(businesses.map((b) => [b.id, b]));
const vanityById = new Map();
for (const v of vanity) if (byId.has(v.target_id)) vanityById.set(v.target_id, v.slug);

function buildHtml(biz, slugPath) {
  const img = (biz.images && biz.images[0]) || DEFAULT_IMG;
  const rawDesc = biz.hook_fr || biz.description || `Découvrez ${biz.name}.`;
  const title = `${biz.name}${biz.city ? ` – ${biz.city}` : ""} | ${SITE}`;
  const description = stripHtml(rawDesc).substring(0, 160);
  const url = `${BASE}/${slugPath}`;
  const t = esc(title), d = esc(description), i = esc(img), u = esc(url), n = esc(biz.name);
  const fallback = `/search?openBusiness=${biz.id}&pinIds=${biz.id}&q=${encodeURIComponent(biz.name)}${biz.city ? `&t=${encodeURIComponent(biz.city)}` : ""}`;
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>${t}</title>
    <meta name="description" content="${d}" />
    <link rel="canonical" href="${u}" />

    <meta property="og:type" content="website" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:url" content="${u}" />
    <meta property="og:image" content="${i}" />
    <meta property="og:image:secure_url" content="${i}" />
    <meta property="og:image:alt" content="${n}" />
    <meta property="og:site_name" content="${SITE}" />
    <meta property="og:locale" content="fr_FR" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    <meta name="twitter:image" content="${i}" />
  </head>
  <body style="background-color:#faf8f5;margin:0">
    <script>
      (function () {
        var ua = navigator.userAgent || "";
        var isPreviewBot = /WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Pinterest|Discordbot|Googlebot|bingbot/i.test(ua);
        if (isPreviewBot) return;
        window.location.replace(${JSON.stringify(fallback)});
      })();
    </script>
    <noscript>
      <h1>${t}</h1>
      <p>${d}</p>
    </noscript>
  </body>
</html>
`;
}

let written = 0, skipped = 0;
async function writeOne(slugPath, biz) {
  const dir = path.join(ROOT, "public", slugPath);
  const file = path.join(dir, "index.html");
  if (!FORCE && existsSync(file)) { skipped++; return; }
  await mkdir(dir, { recursive: true });
  await writeFile(file, buildHtml(biz, slugPath), "utf8");
  written++;
}

for (const biz of businesses) {
  const vSlug = vanityById.get(biz.id);
  if (vSlug) await writeOne(vSlug, biz);
  if (biz.slug) await writeOne(`fiche/${biz.slug}`, biz);
}

console.log(`[gen-og-public] wrote=${written} skipped=${skipped} businesses=${businesses.length} vanity=${vanityById.size}`);
