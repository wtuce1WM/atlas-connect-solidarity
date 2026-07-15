import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertStaff } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = await assertStaff(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const bucketHost = new URL(supabaseUrl).host;
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const dryRun = body.dry_run === true;
    const batchLimit = body.limit || 10;
    const excludeIds: string[] = body.exclude_ids || [];

    // Only fetch businesses that have external URLs
    const query = supabase
      .from("businesses")
      .select("id, name, images, logo_url, logo_2_url")
      .order("name");

    // Exclude already-failed business IDs
    if (excludeIds.length > 0) {
      query.not("id", "in", `(${excludeIds.join(",")})`);
    }

    const { data: businesses, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    // Filter to only businesses with external URLs
    const withExternal = (businesses || []).filter((biz) => {
      const hasExternalImages = biz.images?.some((url: string) => url && !url.includes(bucketHost));
      const hasExternalLogo = biz.logo_url && !biz.logo_url.includes(bucketHost);
      const hasExternalLogo2 = biz.logo_2_url && !biz.logo_2_url.includes(bucketHost);
      return hasExternalImages || hasExternalLogo || hasExternalLogo2;
    });

    if (dryRun) {
      const externalUrls: { business: string; field: string; url: string }[] = [];
      for (const biz of withExternal) {
        if (biz.images) {
          biz.images.forEach((url: string, i: number) => {
            if (url && !url.includes(bucketHost))
              externalUrls.push({ business: biz.name, field: `images[${i}]`, url });
          });
        }
        if (biz.logo_url && !biz.logo_url.includes(bucketHost))
          externalUrls.push({ business: biz.name, field: "logo_url", url: biz.logo_url });
        if (biz.logo_2_url && !biz.logo_2_url.includes(bucketHost))
          externalUrls.push({ business: biz.name, field: "logo_2_url", url: biz.logo_2_url });
      }
      return new Response(
        JSON.stringify({ totalBusinesses: withExternal.length, totalExternalUrls: externalUrls.length, urls: externalUrls }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process only a batch to avoid timeout
    const batch = withExternal.slice(0, batchLimit);
    let totalInternalized = 0;
    let totalFailed = 0;
    const details: { business: string; businessId: string; field: string; from: string; to: string; error?: string }[] = [];

    for (const biz of batch) {
      const updates: Record<string, unknown> = {};

      if (biz.images && biz.images.length > 0) {
        const newImages = [...biz.images];
        let changed = false;
        for (let i = 0; i < newImages.length; i++) {
          const url = newImages[i];
          if (!url || url.includes(bucketHost)) continue;
          const result = await downloadAndUpload(supabase, url, biz.id, `img-${i}`);
          if (result.success) {
            newImages[i] = result.publicUrl!;
            changed = true;
            totalInternalized++;
            details.push({ business: biz.name, businessId: biz.id, field: `images[${i}]`, from: url, to: result.publicUrl! });
          } else {
            totalFailed++;
            details.push({ business: biz.name, businessId: biz.id, field: `images[${i}]`, from: url, to: "", error: result.error });
          }
        }
        if (changed) updates.images = newImages;
      }

      for (const field of ["logo_url", "logo_2_url"] as const) {
        const url = biz[field];
        if (!url || url.includes(bucketHost)) continue;
        const result = await downloadAndUpload(supabase, url, biz.id, field);
        if (result.success) {
          updates[field] = result.publicUrl!;
          totalInternalized++;
          details.push({ business: biz.name, businessId: biz.id, field, from: url, to: result.publicUrl! });
        } else {
          totalFailed++;
          details.push({ business: biz.name, businessId: biz.id, field, from: url, to: "", error: result.error });
        }
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from("businesses").update(updates).eq("id", biz.id);
      }
    }

    const remaining = withExternal.length - batch.length;

    return new Response(
      JSON.stringify({ totalInternalized, totalFailed, remaining, details }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function downloadAndUpload(
  supabase: any,
  externalUrl: string,
  businessId: string,
  suffix: string
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(externalUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const blob = await response.blob();

    if (blob.size === 0) {
      return { success: false, error: "Empty file" };
    }

    const extMap: Record<string, string> = {
      "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
      "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
    };
    const ext = extMap[contentType.split(";")[0]] || "jpg";
    const fileName = `${businessId}-${suffix}-${Date.now()}.${ext}`;
    const filePath = `businesses/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("business-images")
      .upload(filePath, blob, { contentType, upsert: false });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data: urlData } = supabase.storage
      .from("business-images")
      .getPublicUrl(filePath);

    return { success: true, publicUrl: urlData.publicUrl };
  } catch (err) {
    return { success: false, error: err.message || "Download failed" };
  }
}
