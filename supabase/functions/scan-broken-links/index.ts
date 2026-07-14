import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertStaff } from "../_shared/auth-helpers.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const URL_FIELDS = [
  "website",
  "menu_url",
  "flipbook_url",
  "pdf_url",
  "pdf_2_url",
  "pdf_3_url",
  "reserve_now_url",
  "booking_url",
  "other_booking_url",
  "online_shop_url",
  "video_1_url",
  "glovo_url",
  "matterport_url",
];

// Known legitimate redirect pairs (from → to) — not domain hijacking
const REDIRECT_WHITELIST: [string, string][] = [
  ["youtu.be", "youtube.com"],
  ["youtube.com", "youtube.com"],
  ["vimeo.com", "vimeocdn.com"],
  ["player.vimeo.com", "vimeocdn.com"],
  ["bit.ly", ""],            // any destination is expected
  ["goo.gl", ""],
  ["t.co", ""],
  ["tinyurl.com", ""],
  ["ow.ly", ""],
  ["permalink.fairmont.com", "fairmont.com"],
  ["app.thebookingbutton.com", "direct-book.com"],
  ["book.eatnow.ma", "eat-now.io"],
  ["lesterrassesdesarts.ma", "filesusr.com"],  // Wix CDN
];

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isWhitelistedRedirect(fromDomain: string, toDomain: string): boolean {
  for (const [from, to] of REDIRECT_WHITELIST) {
    if (fromDomain.endsWith(from)) {
      if (to === "" || toDomain.endsWith(to)) return true;
    }
  }
  return false;
}

async function checkUrl(
  url: string
): Promise<{ ok: boolean; status: number | null; error?: string; domainChanged?: boolean; finalUrl?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const resp = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LinkChecker/1.0)" },
    });
    clearTimeout(timeout);

    if (resp.status === 405) {
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 12000);
      const resp2 = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller2.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LinkChecker/1.0)" },
      });
      clearTimeout(timeout2);
      await resp2.text().catch(() => {});
      const ok2 = resp2.status >= 200 && resp2.status < 400;
      const fromD = extractDomain(url);
      const toD = extractDomain(resp2.url);
      const domainChanged2 = ok2 && fromD !== toD && !isWhitelistedRedirect(fromD, toD);
      return { ok: ok2 && !domainChanged2, status: resp2.status, domainChanged: domainChanged2, finalUrl: domainChanged2 ? resp2.url : undefined };
    }

    const ok = resp.status >= 200 && resp.status < 400;
    const fromD = extractDomain(url);
    const toD = extractDomain(resp.url);
    const domainChanged = ok && fromD !== toD && !isWhitelistedRedirect(fromD, toD);
    return {
      ok: ok && !domainChanged,
      status: resp.status,
      domainChanged,
      finalUrl: domainChanged ? resp.url : undefined,
    };
  } catch (err) {
    return {
      ok: false,
      status: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await assertStaff(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const selectFields = ["id", "name", ...URL_FIELDS].join(", ");

    let allBusinesses: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("businesses")
        .select(selectFields)
        .eq("is_active", true)
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allBusinesses = allBusinesses.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    console.log(`Scanning URLs for ${allBusinesses.length} businesses`);

    const urlEntries: { url: string; businessId: string; field: string }[] = [];
    for (const b of allBusinesses) {
      for (const field of URL_FIELDS) {
        const url = b[field];
        if (url && typeof url === "string" && url.startsWith("http")) {
          urlEntries.push({ url, businessId: b.id, field });
        }
      }
    }

    const uniqueUrls = [...new Set(urlEntries.map((e) => e.url))];
    console.log(`Checking ${uniqueUrls.length} unique URLs...`);

    const urlResults = new Map<
      string,
      { ok: boolean; status: number | null; error?: string; domainChanged?: boolean; finalUrl?: string }
    >();

    let totalBrokenPersisted = 0;
    let totalOkDeactivated = 0;

    // Process in batches of 20 and persist immediately after each batch
    for (let i = 0; i < uniqueUrls.length; i += 20) {
      const batch = uniqueUrls.slice(i, i + 20);
      const checks = await Promise.all(
        batch.map(async (url) => {
          const result = await checkUrl(url);
          return { url, result };
        })
      );

      const batchBrokenRows: any[] = [];
      const batchOkUrls: string[] = [];

      for (const { url, result } of checks) {
        urlResults.set(url, result);
        if (!result.ok) {
          const reason = result.domainChanged
            ? `DOMAIN CHANGED → ${result.finalUrl}`
            : `${result.status || result.error}`;
          console.log(`BROKEN: ${url} → ${reason}`);

          // Collect broken entries for this URL
          for (const entry of urlEntries.filter(e => e.url === url)) {
            batchBrokenRows.push({
              url: entry.url,
              business_id: entry.businessId,
              field_name: entry.field,
              http_status: result.status,
              error_message: result.domainChanged ? `Domain changed → ${result.finalUrl}` : (result.error || null),
              is_active: true,
              updated_at: new Date().toISOString(),
            });
          }
        } else {
          batchOkUrls.push(url);
        }
      }

      // Persist broken links immediately
      if (batchBrokenRows.length > 0) {
        const { error } = await supabase
          .from("broken_links")
          .upsert(batchBrokenRows, { onConflict: "url,business_id,field_name" });
        if (error) console.error("Upsert error:", error);
        else totalBrokenPersisted += batchBrokenRows.length;
      }

      // Deactivate OK links immediately
      if (batchOkUrls.length > 0) {
        await supabase
          .from("broken_links")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .in("url", batchOkUrls)
          .eq("is_active", true);
        totalOkDeactivated += batchOkUrls.length;
      }

      console.log(`Progress: ${Math.min(i + 20, uniqueUrls.length)}/${uniqueUrls.length} URLs checked, ${totalBrokenPersisted} broken persisted`);
    }

    const brokenCount = [...urlResults.values()].filter(r => !r.ok).length;

    const summary = {
      totalBusinesses: allBusinesses.length,
      totalUrls: uniqueUrls.length,
      brokenUrls: brokenCount,
      brokenEntries: totalBrokenPersisted,
    };

    console.log(`Done. ${summary.brokenUrls}/${summary.totalUrls} URLs broken.`);

    return new Response(JSON.stringify({ summary }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
