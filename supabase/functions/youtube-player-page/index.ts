/**
 * youtube-player-page
 *
 * Serves a minimal HTML page hosting a YouTube IFrame Player API instance.
 * Used as the target URL for ApiFlash so that YouTube embeds correctly
 * (the embed origin is our own domain, avoiding "Error 153" config errors
 * that occur when capturing youtube.com/embed directly from a server).
 *
 * Query params:
 *   ?id=<11-char video id>&t=<seconds>
 *
 * Public (no JWT) — only renders an iframe to a known YouTube id.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const id = (url.searchParams.get("id") || "").trim();
  const t = Math.max(0, Math.floor(Number(url.searchParams.get("t") || "0")));

  if (!/^[\w-]{11}$/.test(id)) {
    return new Response("invalid id", { status: 400, headers: corsHeaders });
  }

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>player</title>
<style>
  html,body{margin:0;padding:0;background:#000;width:100%;height:100%;overflow:hidden}
  #player,#player iframe{position:absolute;inset:0;width:100%!important;height:100%!important;border:0}
</style>
</head>
<body>
<div id="player"></div>
<script>
  var startAt = ${t};
  var videoId = ${JSON.stringify(id)};
  var tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
  function onYouTubeIframeAPIReady() {
    new YT.Player('player', {
      videoId: videoId,
      playerVars: {
        autoplay: 1, mute: 1, controls: 0, rel: 0,
        modestbranding: 1, playsinline: 1, start: startAt,
        iv_load_policy: 3, fs: 0, disablekb: 1
      },
      events: {
        onReady: function(e) {
          try { e.target.mute(); } catch(_) {}
          try { e.target.seekTo(startAt, true); } catch(_) {}
          try { e.target.playVideo(); } catch(_) {}
        }
      }
    });
  }
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
});
