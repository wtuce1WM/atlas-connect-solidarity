import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Extract channel identifier from various YouTube URL formats */
function parseChannelUrl(url: string): { type: "handle" | "channel" | "user"; value: string } | null {
  const handleMatch = url.match(/youtube\.com\/@([\w.-]+)/);
  if (handleMatch) return { type: "handle", value: handleMatch[1] };

  const channelMatch = url.match(/youtube\.com\/channel\/(UC[\w-]+)/);
  if (channelMatch) return { type: "channel", value: channelMatch[1] };

  const userMatch = url.match(/youtube\.com\/user\/([\w.-]+)/);
  if (userMatch) return { type: "user", value: userMatch[1] };

  const cMatch = url.match(/youtube\.com\/c\/([\w.-]+)/);
  if (cMatch) return { type: "handle", value: cMatch[1] };

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("YOUTUBE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "YOUTUBE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { channelUrl, maxResults = 10, businessId, syncToDb = false } = await req.json();
    if (!channelUrl) {
      return new Response(JSON.stringify({ error: "channelUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = parseChannelUrl(channelUrl);
    if (!parsed) {
      return new Response(JSON.stringify({ error: "Invalid YouTube channel URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Resolve channel ID
    let channelId: string | null = null;

    if (parsed.type === "channel") {
      channelId = parsed.value;
    } else if (parsed.type === "handle") {
      const searchUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${parsed.value}&key=${apiKey}`;
      const res = await fetch(searchUrl);
      const data = await res.json();
      channelId = data.items?.[0]?.id || null;
    } else {
      const searchUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${parsed.value}&key=${apiKey}`;
      const res = await fetch(searchUrl);
      const data = await res.json();
      channelId = data.items?.[0]?.id || null;
    }

    if (!channelId) {
      return new Response(JSON.stringify({ error: "Channel not found", videos: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Fetch latest videos from channel using search endpoint
    const limit = Math.min(maxResults, 50);
    const searchApiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=${limit}&key=${apiKey}`;
    const searchRes = await fetch(searchApiUrl);
    const searchData = await searchRes.json();

    if (!searchRes.ok) {
      console.error("YouTube API error:", JSON.stringify(searchData));
      return new Response(JSON.stringify({ error: "YouTube API error", details: searchData.error?.message }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const videoIds = (searchData.items || [])
      .map((item: any) => item.id?.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) {
      return new Response(JSON.stringify({ videos: [], channelId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Get video details (duration, to distinguish shorts vs regular)
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds.join(",")}&key=${apiKey}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    const videos = (detailsData.items || []).map((item: any) => {
      const duration = item.contentDetails?.duration || "";
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const seconds = match
        ? (parseInt(match[1] || "0") * 3600) + (parseInt(match[2] || "0") * 60) + parseInt(match[3] || "0")
        : 0;
      const title = item.snippet?.title || "";
      const isShort = (seconds > 0 && seconds <= 180) || /\bshorts?\b/i.test(title);

      return {
        videoId: item.id,
        title: item.snippet?.title || "",
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || "",
        publishedAt: item.snippet?.publishedAt || "",
        isShort,
        durationSeconds: seconds,
      };
    });

    // Step 4: Optionally sync to database
    if (syncToDb && businessId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const sb = createClient(supabaseUrl, supabaseServiceKey);

        // Upsert all videos
        const rows = videos.map((v: any, idx: number) => ({
          business_id: businessId,
          video_id: v.videoId,
          title: v.title,
          thumbnail: v.thumbnail,
          published_at: v.publishedAt || null,
          is_short: v.isShort,
          duration_seconds: v.durationSeconds,
          sort_order: idx,
        }));

        if (rows.length > 0) {
          const { error: upsertError } = await sb
            .from("business_youtube_videos")
            .upsert(rows, { onConflict: "business_id,video_id", ignoreDuplicates: false });

          if (upsertError) {
            console.error("Upsert error:", upsertError);
          }
        }
      } catch (dbErr) {
        console.error("DB sync error:", dbErr);
      }
    }

    return new Response(JSON.stringify({ videos, channelId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
