import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://oneworldmorocco.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Fetch all dynamic data in parallel
  const [
    businessesRes,
    categoriesRes,
    subcategoriesRes,
    citiesRes,
    neighborhoodsRes,
    destinationsRes,
    blogPostsRes,
    servicesRes,
    poisRes,
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("slug, updated_at")
      .eq("is_active", true)
      .order("updated_at", { ascending: false }),
    supabase.from("categories").select("name_fr"),
    supabase.from("subcategories").select("name_fr"),
    supabase.from("cities").select("name_fr").eq("is_active", true),
    supabase.from("neighborhoods").select("name"),
    supabase.from("destinations").select("name_fr"),
    supabase
      .from("blog_posts")
      .select("slug, updated_at")
      .eq("is_published", true),
    supabase.from("services").select("name_fr"),
    supabase.from("points_of_interest").select("name_fr"),
  ]);

  const today = new Date().toISOString().split("T")[0];

  // Static pages
  const staticPages = [
    { loc: "/", changefreq: "daily", priority: "1.0" },
    { loc: "/search", changefreq: "daily", priority: "0.9" },
    { loc: "/carte", changefreq: "weekly", priority: "0.8" },
    { loc: "/hotels", changefreq: "weekly", priority: "0.8" },
    { loc: "/blog", changefreq: "weekly", priority: "0.7" },
    { loc: "/mission", changefreq: "monthly", priority: "0.6" },
    { loc: "/contact", changefreq: "monthly", priority: "0.6" },
    { loc: "/club", changefreq: "monthly", priority: "0.6" },
    { loc: "/devenir-affilie", changefreq: "monthly", priority: "0.5" },
    { loc: "/conditions-generales", changefreq: "yearly", priority: "0.3" },
  ];

  const escXml = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const urlEntry = (
    loc: string,
    changefreq: string,
    priority: string,
    lastmod?: string
  ) =>
    `  <url>
    <loc>${escXml(BASE_URL + loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const urls: string[] = [];

  // Static pages
  for (const p of staticPages) {
    urls.push(urlEntry(p.loc, p.changefreq, p.priority, today));
  }

  // Businesses
  if (businessesRes.data) {
    for (const b of businessesRes.data) {
      const lastmod = b.updated_at?.split("T")[0] || today;
      urls.push(urlEntry(`/business/${b.slug}`, "weekly", "0.8", lastmod));
    }
  }

  // Categories
  if (categoriesRes.data) {
    for (const c of categoriesRes.data) {
      urls.push(
        urlEntry(`/category/${encodeURIComponent(c.name_fr)}`, "weekly", "0.7")
      );
    }
  }

  // Subcategories
  if (subcategoriesRes.data) {
    for (const s of subcategoriesRes.data) {
      urls.push(
        urlEntry(
          `/subcategory/${encodeURIComponent(s.name_fr)}`,
          "weekly",
          "0.6"
        )
      );
    }
  }

  // Cities
  if (citiesRes.data) {
    for (const c of citiesRes.data) {
      urls.push(
        urlEntry(`/city/${encodeURIComponent(c.name_fr)}`, "weekly", "0.7")
      );
    }
  }

  // Neighborhoods
  if (neighborhoodsRes.data) {
    for (const n of neighborhoodsRes.data) {
      urls.push(
        urlEntry(
          `/neighborhood/${encodeURIComponent(n.name)}`,
          "weekly",
          "0.6"
        )
      );
    }
  }

  // Destinations
  if (destinationsRes.data) {
    for (const d of destinationsRes.data) {
      urls.push(
        urlEntry(
          `/destination/${encodeURIComponent(d.name_fr)}`,
          "weekly",
          "0.6"
        )
      );
    }
  }

  // Blog posts
  if (blogPostsRes.data) {
    for (const p of blogPostsRes.data) {
      const lastmod = p.updated_at?.split("T")[0] || today;
      urls.push(urlEntry(`/blog/${p.slug}`, "monthly", "0.6", lastmod));
    }
  }

  // Services
  if (servicesRes.data) {
    for (const s of servicesRes.data) {
      urls.push(
        urlEntry(`/service/${encodeURIComponent(s.name_fr)}`, "weekly", "0.6")
      );
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
