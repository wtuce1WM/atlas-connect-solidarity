import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_VIDEO_BYTES = 120 * 1024 * 1024; // 120 MB

const contentTypeToExt: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
  "video/ogg": "ogv",
};

function extractExtFromUrl(rawUrl: string): string | null {
  try {
    const pathname = new URL(rawUrl).pathname.toLowerCase();
    const match = pathname.match(/\.([a-z0-9]{2,5})$/);
    if (!match) return null;
    const ext = match[1];
    if (["mp4", "webm", "mov", "m4v", "ogv", "avi"].includes(ext)) return ext;
    return null;
  } catch {
    return null;
  }
}

function isLikelyVideo(contentType: string | null, url: string): boolean {
  if (contentType?.toLowerCase().startsWith("video/")) return true;
  return !!extractExtFromUrl(url);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { data: isStaff } = await userClient.rpc("is_staff", { _user_id: userId });
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const videoUrl = String(body?.videoUrl || "").trim();
    const businessId = String(body?.businessId || "").trim();

    if (!videoUrl || !businessId) {
      return new Response(JSON.stringify({ error: "videoUrl and businessId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (/\/storage\/v1\/object\/public\/business-videos\//i.test(videoUrl)) {
      return new Response(JSON.stringify({ publicUrl: videoUrl, alreadyInternal: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const videoUrlObj = new URL(videoUrl);
    if (!["http:", "https:"].includes(videoUrlObj.protocol)) {
      return new Response(JSON.stringify({ error: "Invalid videoUrl protocol" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    const sourceResp = await fetch(videoUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; VideoInternalizer/1.0)",
        Accept: "video/*,*/*",
      },
    });
    clearTimeout(timeout);

    if (!sourceResp.ok) {
      return new Response(JSON.stringify({ error: `Video fetch failed (${sourceResp.status})` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = sourceResp.headers.get("content-type")?.split(";")[0]?.trim() || null;
    if (!isLikelyVideo(contentType, videoUrl)) {
      return new Response(JSON.stringify({ error: `URL does not look like a video (${contentType || "unknown"})` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const blob = await sourceResp.blob();
    if (!blob.size) {
      return new Response(JSON.stringify({ error: "Downloaded video is empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (blob.size > MAX_VIDEO_BYTES) {
      return new Response(JSON.stringify({ error: `Video too large (${blob.size} bytes)` }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext =
      (contentType && contentTypeToExt[contentType.toLowerCase()]) ||
      extractExtFromUrl(videoUrl) ||
      "mp4";

    const uploadPath = `businesses/${businessId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const uploadType = contentType || `video/${ext}`;

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { error: uploadError } = await serviceClient.storage
      .from("business-videos")
      .upload(uploadPath, blob, {
        contentType: uploadType,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: urlData } = serviceClient.storage.from("business-videos").getPublicUrl(uploadPath);

    return new Response(
      JSON.stringify({
        publicUrl: urlData.publicUrl,
        path: uploadPath,
        contentType: uploadType,
        size: blob.size,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("internalize-video error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
