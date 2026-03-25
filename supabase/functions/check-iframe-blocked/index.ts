import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function isIframeBlocked(headers: Headers): { blocked: boolean; reason: string } {
  const xfo = headers.get("x-frame-options");
  if (xfo) {
    const val = xfo.toUpperCase();
    if (val === "DENY" || val === "SAMEORIGIN") {
      return { blocked: true, reason: `X-Frame-Options: ${xfo}` };
    }
  }
  const csp = headers.get("content-security-policy");
  if (csp) {
    const faMatch = csp.match(/frame-ancestors\s+([^;]+)/i);
    if (faMatch) {
      const value = faMatch[1].trim();
      if (value === "'none'" || value === "'self'" || !value.includes("*")) {
        return { blocked: true, reason: `CSP frame-ancestors: ${value}` };
      }
    }
  }
  return { blocked: false, reason: "" };
}

async function checkUrl(url: string): Promise<{ blocked: boolean; reason: string; error?: string; httpStatus?: number }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; iframe-check/1.0)" },
    });
    clearTimeout(timeout);

    if (resp.status >= 500) {
      return { blocked: true, reason: `HTTP ${resp.status}`, httpStatus: resp.status };
    }

    const iframeCheck = isIframeBlocked(resp.headers);
    return { ...iframeCheck, httpStatus: resp.status };
  } catch (err) {
    return { blocked: true, reason: `Connexion échouée`, error: String(err) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Fetching businesses...");

    const fields = "id, name, reserve_now_url, booking_url, other_booking_url, other_booking_name";
    
    const [r1, r2, r3] = await Promise.all([
      supabase.from("businesses").select(fields).eq("is_active", true).not("reserve_now_url", "is", null),
      supabase.from("businesses").select(fields).eq("is_active", true).not("booking_url", "is", null),
      supabase.from("businesses").select(fields).eq("is_active", true).not("other_booking_url", "is", null),
    ]);

    const allMap = new Map<string, any>();
    for (const list of [r1.data || [], r2.data || [], r3.data || []]) {
      for (const b of list) allMap.set(b.id, b);
    }
    const allBusinesses = Array.from(allMap.values());
    console.log(`Found ${allBusinesses.length} businesses with booking URLs`);

    // Group by domain
    const domainMap = new Map<string, { url: string; domain: string; businesses: { id: string; name: string; field: string }[] }>();

    for (const b of allBusinesses) {
      const urls: { url: string; field: string }[] = [];
      if (b.reserve_now_url) urls.push({ url: b.reserve_now_url, field: "reserve_now_url" });
      if (b.booking_url) urls.push({ url: b.booking_url, field: "booking_url" });
      if (b.other_booking_url) urls.push({ url: b.other_booking_url, field: "other_booking_url" });

      for (const { url, field } of urls) {
        const domain = extractDomain(url);
        if (!domainMap.has(domain)) {
          domainMap.set(domain, { url, domain, businesses: [] });
        }
        domainMap.get(domain)!.businesses.push({ id: b.id, name: b.name, field });
      }
    }

    console.log(`Checking ${domainMap.size} unique domains...`);

    // Check all domains in parallel (batches of 10)
    const entries = Array.from(domainMap.values());
    const results: any[] = [];

    for (let i = 0; i < entries.length; i += 10) {
      const batch = entries.slice(i, i + 10);
      const checks = await Promise.all(
        batch.map(async (entry) => {
          const check = await checkUrl(entry.url);
          console.log(`${entry.domain}: ${check.blocked ? "BLOCKED" : "ok"} ${check.reason || check.error || ""}`);
          return {
            domain: entry.domain,
            sampleUrl: entry.url,
            blocked: check.blocked,
            reason: check.reason,
            error: check.error,
            businessCount: entry.businesses.length,
            businesses: entry.businesses,
          };
        })
      );
      results.push(...checks);
    }

    results.sort((a, b) => {
      if (a.blocked !== b.blocked) return a.blocked ? -1 : 1;
      return b.businessCount - a.businessCount;
    });

    // Persist blocked domains to the database
    const blockedResults = results.filter(r => r.blocked);
    const unblockedDomains = results.filter(r => !r.blocked).map(r => r.domain);

    if (blockedResults.length > 0) {
      // Upsert blocked domains
      const rows = blockedResults.map(r => ({
        domain: r.domain,
        reason: r.reason || r.error || 'Unknown',
        is_active: true,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase
        .from("blocked_domains")
        .upsert(rows, { onConflict: "domain" });

      if (upsertError) {
        console.error("Error upserting blocked domains:", upsertError);
      } else {
        console.log(`Upserted ${rows.length} blocked domains`);
      }
    }

    // Deactivate domains that are no longer blocked
    let autoUnforcedCount = 0;
    if (unblockedDomains.length > 0) {
      const { error: deactivateError } = await supabase
        .from("blocked_domains")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in("domain", unblockedDomains);

      if (deactivateError) {
        console.error("Error deactivating unblocked domains:", deactivateError);
      } else {
        console.log(`Deactivated ${unblockedDomains.length} previously blocked domains`);
      }

      // Auto-reset reserve_now_force_external for businesses whose booking domains are now unblocked
      const unblockedSet = new Set(unblockedDomains);
      const { data: forcedBiz } = await supabase
        .from("businesses")
        .select("id, reserve_now_url, booking_url, other_booking_url")
        .eq("is_active", true)
        .eq("reserve_now_force_external", true);

      if (forcedBiz) {
        const toUnforce: string[] = [];
        for (const b of forcedBiz) {
          const urls = [b.reserve_now_url, b.booking_url, b.other_booking_url].filter(Boolean);
          const allUnblocked = urls.length > 0 && urls.every((u: string) => {
            try { return unblockedSet.has(new URL(u).hostname); } catch { return false; }
          });
          if (allUnblocked) toUnforce.push(b.id);
        }

        if (toUnforce.length > 0) {
          for (let i = 0; i < toUnforce.length; i += 50) {
            const batch = toUnforce.slice(i, i + 50);
            await supabase
              .from("businesses")
              .update({ reserve_now_force_external: false, updated_at: new Date().toISOString() })
              .in("id", batch);
          }
          autoUnforcedCount = toUnforce.length;
          console.log(`Auto-reset reserve_now_force_external=false for ${autoUnforcedCount} businesses`);
        }
      }
    }

    // Auto-set reserve_now_force_external for businesses with blocked booking domains
    const blockedDomainSet = new Set(blockedResults.map((r: any) => r.domain));
    let autoForcedCount = 0;

    if (blockedDomainSet.size > 0) {
      // Get all businesses with booking URLs
      const bookingFields = "id, reserve_now_url, booking_url, other_booking_url, reserve_now_force_external";
      const { data: allBiz } = await supabase
        .from("businesses")
        .select(bookingFields)
        .eq("is_active", true);

      if (allBiz) {
        const toForce: string[] = [];
        for (const b of allBiz) {
          if (b.reserve_now_force_external) continue; // already forced
          const urls = [b.reserve_now_url, b.booking_url, b.other_booking_url].filter(Boolean);
          const hasBlocked = urls.some((u: string) => {
            try { return blockedDomainSet.has(new URL(u).hostname); } catch { return false; }
          });
          if (hasBlocked) toForce.push(b.id);
        }

        if (toForce.length > 0) {
          // Update in batches of 50
          for (let i = 0; i < toForce.length; i += 50) {
            const batch = toForce.slice(i, i + 50);
            const { error: forceError } = await supabase
              .from("businesses")
              .update({ reserve_now_force_external: true, updated_at: new Date().toISOString() })
              .in("id", batch);
            if (forceError) {
              console.error("Error forcing external for batch:", forceError);
            }
          }
          autoForcedCount = toForce.length;
          console.log(`Auto-set reserve_now_force_external=true for ${autoForcedCount} businesses`);
        }
      }
    }

    const blockedDomains = blockedResults;
    const summary = {
      totalDomains: results.length,
      blockedDomains: blockedDomains.length,
      totalBusinessesAffected: blockedDomains.reduce((sum: number, r: any) => sum + r.businessCount, 0),
      autoForcedExternal: autoForcedCount,
      autoUnforcedExternal: autoUnforcedCount,
    };

    console.log(`Done. ${summary.blockedDomains}/${summary.totalDomains} domains blocked. ${autoForcedCount} forced, ${autoUnforcedCount} unforced.`);

    return new Response(JSON.stringify({ summary, results }, null, 2), {
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
