// Génère public/sitemap.xml en combinant routes statiques + contenu dynamique (Supabase).
// Usage : `bunx tsx scripts/generate-sitemap.ts` (lancé manuellement ou via predev/prebuild).

import { writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://oneworldmorocco.com";
const SUPABASE_URL = "https://plnphgdrawpsnumnejzc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbnBoZ2RyYXdwc251bW5lanpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjA5ODcsImV4cCI6MjA4NTgzNjk4N30.RwHKmL6E0Gd2LTVvDkfYx5RkZ-k7LKKp4iUoCS34pW4";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

// Blog articles are now served from public.blog_posts (see DB fetch below).
// Only special blog routes that are NOT stored as blog_posts rows remain hardcoded.
const HARDCODED_BLOG_ROUTES = ["etablissements-notes"];

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/search", changefreq: "daily", priority: "0.9" },
  { path: "/carte", changefreq: "weekly", priority: "0.8" },
  { path: "/hotels", changefreq: "weekly", priority: "0.8" },
  { path: "/blog", changefreq: "weekly", priority: "0.9" },
  ...HARDCODED_BLOG_ROUTES.map((slug) => ({
    path: `/blog/${slug}`,
    changefreq: "weekly" as const,
    priority: "0.9",
  })),
  { path: "/mission", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/club", changefreq: "monthly", priority: "0.6" },
  { path: "/devenir-affilie", changefreq: "monthly", priority: "0.5" },
  { path: "/conditions-generales", changefreq: "yearly", priority: "0.3" },
  { path: "/ancien-index", changefreq: "monthly", priority: "0.3" },
];

function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function toIsoDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return undefined;
  }
}

async function fetchDynamicEntries(): Promise<SitemapEntry[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const entries: SitemapEntry[] = [];

  // Businesses actifs — vanity URL `/<slug>` (canonique, résolue par VanityResolver)
  const businesses: { slug: string | null; updated_at: string | null }[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("businesses")
      .select("slug, updated_at")
      .eq("is_active", true)
      .not("slug", "is", null)
      .order("slug")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    businesses.push(...(data as any));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  for (const b of businesses) {
    if (!b.slug) continue;
    entries.push({
      path: `/${encodeURIComponent(b.slug)}`,
      lastmod: toIsoDate(b.updated_at),
      changefreq: "weekly",
      priority: "0.8",
    });
  }

  // Destinations (route = /destination/:destinationName, avec name_fr décodé)
  const { data: destinations, error: destErr } = await supabase
    .from("destinations")
    .select("name_fr, updated_at")
    .eq("is_searchable", true);
  if (destErr) throw destErr;
  for (const d of (destinations || []) as { name_fr: string | null; updated_at: string | null }[]) {
    if (!d.name_fr) continue;
    entries.push({
      path: `/destination/${encodeURIComponent(d.name_fr)}`,
      lastmod: toIsoDate(d.updated_at),
      changefreq: "weekly",
      priority: "0.7",
    });
  }

  // Blog posts publiés
  const { data: posts, error: postsErr } = await supabase
    .from("blog_posts")
    .select("slug, updated_at")
    .eq("is_published", true);
  if (postsErr) throw postsErr;
  for (const p of (posts || []) as { slug: string | null; updated_at: string | null }[]) {
    if (!p.slug) continue;
    entries.push({
      path: `/blog/${encodeURIComponent(p.slug)}`,
      lastmod: toIsoDate(p.updated_at),
      changefreq: "weekly",
      priority: "0.9",
    });
  }

  // Catégories distinctes (route = /category/:categoryName)
  const { data: catRows, error: catErr } = await supabase
    .from("businesses")
    .select("main_category")
    .eq("is_active", true)
    .not("main_category", "is", null);
  if (catErr) throw catErr;
  const categories = Array.from(new Set(((catRows || []) as { main_category: string }[]).map((r) => r.main_category).filter(Boolean)));
  for (const cat of categories) {
    entries.push({
      path: `/category/${encodeURIComponent(cat)}`,
      changefreq: "weekly",
      priority: "0.7",
    });
  }

  // Villes distinctes (route = /city/:city)
  const { data: cityRows, error: cityErr } = await supabase
    .from("businesses")
    .select("city")
    .eq("is_active", true)
    .not("city", "is", null);
  if (cityErr) throw cityErr;
  const cities = Array.from(new Set(((cityRows || []) as { city: string }[]).map((r) => r.city).filter(Boolean)));
  for (const c of cities) {
    entries.push({
      path: `/city/${encodeURIComponent(c)}`,
      changefreq: "weekly",
      priority: "0.7",
    });
  }

  return entries;
}

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${xmlEscape(`${BASE_URL}${e.path}`)}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    "",
  ].join("\n");
}

(async () => {
  const dyn = await fetchDynamicEntries();
  const all = [...staticEntries, ...dyn];
  writeFileSync(resolve("public/sitemap.xml"), generateSitemap(all));
  console.log(`sitemap.xml written (${all.length} entries: ${staticEntries.length} static + ${dyn.length} dynamic)`);
})().catch((e) => {
  console.error("Sitemap generation failed:", e);
  process.exit(1);
});
