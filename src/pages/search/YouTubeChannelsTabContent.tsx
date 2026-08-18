import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { YouTubeIcon } from "@/components/staff/SocialMediaIcons";
import BookOnlineSlidePanel from "@/components/BookOnlineSlidePanel";


interface Channel {
  id: string;
  name: string;
  logo_url: string | null;
  youtube_channel_thumbnail_url: string | null;
  youtube_url: string | null;
  city: string | null;
  youtube_channel_featured: boolean;
}

interface ThemeGroup {
  themeId: string;
  themeName: string;
  channels: Channel[];
}

interface Props {
  city?: string | null;
  /** Kept for backward compat — no longer used (YouTube tab now opens BookOnlineSlidePanel internally). */
  onOpenBusiness?: (businessId: string) => void;
  /**
   * Variante « compacte » destinée aux iframes étroites (widget /embed/ask) :
   * pas de vidéo de fond ni de dégradé plein écran, grille responsive au lieu
   * de carrousels horizontaux, aucune écriture dans l'URL (?openChannel).
   * `/search` et `/youtube` restent inchangés (compact = false par défaut).
   */
  compact?: boolean;
}

interface ActiveVideo {
  videoId: string;
  videoUrl: string;
  videoName: string | null;
  owner: { id: string; name: string; logo_url: string | null };
}

const YouTubeChannelsTabContent = ({ city, compact = false }: Props) => {

  const { language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [groups, setGroups] = useState<ThemeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ActiveVideo | null>(null);
  const [activeVideos, setActiveVideos] = useState<ActiveVideo[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const bgIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [bgPlaying, setBgPlaying] = useState(true);
  const [bgMuted, setBgMuted] = useState(true);
  const autoOpenedRef = useRef(false);

  const sendBgCmd = (func: string, args: any[] = []) => {
    const w = bgIframeRef.current?.contentWindow;
    if (!w) return;
    w.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  };

  // Broadcast state + listen for external toggles (from PanelSearchBar leadingControls)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("ytbg:state", { detail: { playing: bgPlaying, muted: bgMuted } }));
  }, [bgPlaying, bgMuted]);

  // Listen to the YouTube iframe state to keep play/pause in sync with reality
  // (autoplay may be blocked → real state differs from optimistic state).
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== bgIframeRef.current?.contentWindow) return;
      let data: any = e.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch { return; }
      }
      if (!data || typeof data !== "object") return;
      if (data.event === "onStateChange") {
        // 1 = playing, 2 = paused, 3 = buffering, 0 = ended, -1 = unstarted, 5 = cued
        if (data.info === 1) setBgPlaying(true);
        else if (data.info === 2 || data.info === 0 || data.info === -1) setBgPlaying(false);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  useEffect(() => {
    const onTogglePlay = () => {
      sendBgCmd(bgPlaying ? "pauseVideo" : "playVideo");
      setBgPlaying((p) => !p);
    };
    const onToggleMute = () => {
      if (bgMuted) { sendBgCmd("unMute"); sendBgCmd("setVolume", [100]); }
      else { sendBgCmd("mute"); }
      setBgMuted((m) => !m);
    };
    const onRequestState = () => {
      window.dispatchEvent(new CustomEvent("ytbg:state", { detail: { playing: bgPlaying, muted: bgMuted } }));
    };
    window.addEventListener("ytbg:toggle-play", onTogglePlay);
    window.addEventListener("ytbg:toggle-mute", onToggleMute);
    window.addEventListener("ytbg:request-state", onRequestState);
    return () => {
      window.removeEventListener("ytbg:toggle-play", onTogglePlay);
      window.removeEventListener("ytbg:toggle-mute", onToggleMute);
      window.removeEventListener("ytbg:request-state", onRequestState);
    };
  }, [bgPlaying, bgMuted]);
  // Notify parent (SearchPage) when the BookOnlineSlidePanel opens/closes so it can hide the bottom bar
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("ytbg:panel", { detail: { open: !!active } }));
    return () => {
      window.dispatchEvent(new CustomEvent("ytbg:panel", { detail: { open: false } }));
    };
  }, [active]);

  // When BookOnlineSlidePanel opens, force-mute AND pause the bg video; restore previous state on close
  const prevMutedRef = useRef<boolean | null>(null);
  const prevPlayingRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (active) {
      prevMutedRef.current = bgMuted;
      prevPlayingRef.current = bgPlaying;
      if (!bgMuted) { sendBgCmd("mute"); setBgMuted(true); }
      if (bgPlaying) { sendBgCmd("pauseVideo"); setBgPlaying(false); }
    } else {
      if (prevMutedRef.current === false) {
        sendBgCmd("unMute");
        sendBgCmd("setVolume", [100]);
        setBgMuted(false);
      }
      if (prevPlayingRef.current === true) {
        sendBgCmd("playVideo");
        setBgPlaying(true);
      }
      prevMutedRef.current = null;
      prevPlayingRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);



  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: themes } = await supabase
        .from("youtube_themes")
        .select("id, name_fr");

      const { data: links } = await supabase
        .from("business_youtube_themes")
        .select("theme_id, business_id");

      const businessIds = Array.from(new Set((links || []).map((l: any) => l.business_id)));
      if (businessIds.length === 0) {
        if (!cancelled) { setGroups([]); setLoading(false); }
        return;
      }

      const query = supabase
        .from("businesses")
        .select("id, name, logo_url, youtube_channel_thumbnail_url, youtube_url, city, youtube_channel_featured")
        .in("id", businessIds)
        .eq("is_active", true)
        .not("youtube_url", "is", null);

      const { data: businesses } = await query;
      const bMap = new Map<string, Channel>();
      (businesses || []).forEach((b: any) => {
        if (b.youtube_url && String(b.youtube_url).trim()) {
          bMap.set(b.id, b);
        }
      });

      const tMap = new Map<string, ThemeGroup>();
      (themes || []).forEach((t: any) => {
        tMap.set(t.id, { themeId: t.id, themeName: t.name_fr, channels: [] });
      });

      (links || []).forEach((l: any) => {
        const ch = bMap.get(l.business_id);
        const grp = tMap.get(l.theme_id);
        if (ch && grp) grp.channels.push(ch);
      });

      const final = Array.from(tMap.values())
        .filter((g) => g.channels.length > 0)
        .filter((g) => g.themeName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") !== "etablissements")
        .map((g) => ({
          ...g,
          channels: [...new Map(g.channels.map((c) => [c.id, c])).values()].sort((a, b) => {
            const fa = a.youtube_channel_featured ? 1 : 0;
            const fb = b.youtube_channel_featured ? 1 : 0;
            if (fa !== fb) return fb - fa;
            return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
          }),
        }))
        .sort((a, b) => a.themeName.localeCompare(b.themeName, "fr", { sensitivity: "base" }));

      if (!cancelled) {
        setGroups(final);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const defaultOpen = useMemo(() => groups.map((g) => g.themeId), [groups]);

  // Auto-open a specific channel when ?openChannel=<businessId> is present.
  useEffect(() => {
    if (compact) return;
    if (autoOpenedRef.current || loading) return;
    const channelId = searchParams.get("openChannel");
    if (!channelId) return;
    const ch = groups.flatMap((g) => g.channels).find((c) => c.id === channelId);
    if (!ch) return;
    autoOpenedRef.current = true;
    handleChannelClick(ch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, loading, searchParams, compact]);

  // Keep ?openChannel=<id> in sync with the active channel so the URL is shareable.
  useEffect(() => {
    if (compact) return;
    const next = new URLSearchParams(searchParams);

    if (active?.owner.id) {
      if (next.get("openChannel") === active.owner.id) return;
      next.set("openChannel", active.owner.id);
      setSearchParams(next, { replace: true });
    } else {
      if (next.has("openChannel") && !autoOpenedRef.current) return;
      if (!next.has("openChannel")) return;
      next.delete("openChannel");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const handleChannelClick = async (ch: Channel) => {
    // Pick the latest video for this business: prefer most-recent short,
    // fallback to most-recent non-short.
    const { data } = await supabase
      .from("business_youtube_videos")
      .select("video_id, title, published_at, is_short")
      .eq("business_id", ch.id)
      .eq("is_visible", true)
      .eq("business_is_active", true)
      .order("published_at", { ascending: false });

    const rows = (data || []) as Array<{ video_id: string; title: string | null; published_at: string | null; is_short: boolean }>;
    const videos = rows.map((row) => ({
      videoId: row.video_id,
      videoUrl: row.is_short
        ? `https://www.youtube.com/shorts/${row.video_id}`
        : `https://www.youtube.com/watch?v=${row.video_id}`,
      videoName: row.title,
      owner: { id: ch.id, name: ch.name, logo_url: ch.logo_url },
    }));

    if (videos.length === 0) {
      // No video available → fallback: open the channel on YouTube
      if (ch.youtube_url) window.open(ch.youtube_url, "_blank", "noopener,noreferrer");
      return;
    }

    setCurrentTime(0);
    setActiveVideos(videos);
    setActive(videos[0]);

    // Track recently viewed — use the YouTube channel thumbnail as the image
    window.dispatchEvent(new CustomEvent("track-business-view", {
      detail: {
        id: ch.id,
        name: ch.name,
        images: ch.youtube_channel_thumbnail_url ? [ch.youtube_channel_thumbnail_url] : null,
        logo_url: ch.logo_url,
        city: ch.city,
        slug: ch.id,
        isYoutubeChannel: true,
      },
    }));
  };

  const activeIndex = active ? activeVideos.findIndex((v) => v.videoId === active.videoId) : -1;
  const hasPrevVideo = activeIndex > 0;
  const hasNextVideo = activeIndex >= 0 && activeIndex < activeVideos.length - 1;
  const goToVideoOffset = (offset: number) => {
    if (activeIndex < 0) return;
    const next = activeVideos[activeIndex + offset];
    if (!next) return;
    setCurrentTime(0);
    setActive(next);
  };

  if (loading) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground" style={{ fontFamily: "'Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif" }}>
        {language === "en" ? "Loading channels…" : language === "ar" ? "جارٍ تحميل القنوات…" : "Chargement des chaînes…"}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground" style={{ fontFamily: "'Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif" }}>
        {language === "en" ? "No YouTube channels found." : language === "ar" ? "لم يتم العثور على قنوات YouTube." : "Aucune chaîne YouTube trouvée."}
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? "relative px-3 pt-2 pb-6 w-full"
          : `relative px-4 pt-16 pb-32 transition-all duration-300 ${active ? "lg:max-w-[50vw] lg:mr-auto lg:ml-0" : "max-w-5xl mx-auto"}`
      }
    >
      {/* Fond vidéo YouTube — désactivé en mode compact (iframe widget) */}
      {!compact && (() => {
        const bgVideoId = (city || "").trim().toLowerCase() === "essaouira" ? "2RlIa-pCINg" : "1l9IMkOcVZk";
        return (
          <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-black">
            <iframe
              ref={bgIframeRef}
              src={`https://www.youtube-nocookie.com/embed/${bgVideoId}?autoplay=1&mute=1&loop=1&playlist=${bgVideoId}&controls=0&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&showinfo=0&enablejsapi=1`}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[max(177.78vh,calc(100%+285px))] h-[max(calc(56.25vw+160px),calc(100%+160px))]"
              allow="autoplay; encrypted-media"
              title="Background video"
              onLoad={() => {
                // Register for player state events so play/pause stays accurate
                // even when autoplay is blocked by the browser.
                const w = bgIframeRef.current?.contentWindow;
                if (!w) return;
                w.postMessage(JSON.stringify({ event: "listening" }), "*");
                w.postMessage(
                  JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }),
                  "*"
                );
              }}
            />
            <div className="absolute inset-0 bg-black/50" />
          </div>
        );
      })()}
      {/* Dégradé pour masquer la liste qui passe derrière le header */}
      {!compact && (
        <div className="fixed top-0 left-0 right-0 h-24 z-[20] pointer-events-none bg-gradient-to-b from-black via-black/80 to-transparent" />
      )}
      <Accordion type="multiple" defaultValue={defaultOpen} className={`space-y-2 relative z-10 ${compact ? "mt-0" : "mt-4"}`}>


        {groups.map((g) => (
          <AccordionItem key={g.themeId} value={g.themeId} className="border border-border/40 rounded-lg bg-card/20 backdrop-blur-sm">

            <AccordionTrigger className="px-4 hover:no-underline text-white font-bold [&>svg]:text-white [&>svg]:stroke-[3]">
              <div className="flex items-center gap-2">
                <YouTubeIcon className="h-4 w-4 text-red-600" />
                <span className="font-bold text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {g.themeName}
                </span>
                <span className="text-[11px] text-white/80 font-normal">
                  ({g.channels.length})
                </span>
              </div>
            </AccordionTrigger>

            <AccordionContent className="px-3 pb-3">
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pt-1 pb-2 px-2" style={{ scrollbarWidth: "none" }}>
                {g.channels.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => handleChannelClick(ch)}
                    className="flex flex-col items-center gap-2 w-24 flex-shrink-0 group"
                  >
                    <div className="relative w-20 h-20 rounded-full overflow-hidden bg-muted border border-border group-hover:border-primary transition-colors">
                      {(ch.youtube_channel_thumbnail_url || ch.logo_url) ? (
                        <img src={ch.youtube_channel_thumbnail_url || ch.logo_url!} alt={ch.name} className="w-full h-full object-cover" loading="lazy" />

                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <YouTubeIcon className="h-6 w-6 text-red-600" />
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow">
                        <YouTubeIcon className="h-3 w-3 text-red-600" />
                      </div>
                    </div>
                    <span
                      className="text-[11px] text-center text-white leading-tight break-words font-bold normal-case"
                      style={{ fontFamily: "'Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif", textTransform: "none" }}
                    >
                      {ch.name}
                    </span>


                  </button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <BookOnlineSlidePanel
        open={!!active}
        onClose={() => { setActive(null); setActiveVideos([]); }}
        videoUrl={active?.videoUrl || null}
        videoId={null}
        businessName={active?.owner.name || ""}
        pageBusinessId={active?.owner.id || null}
        isGeneric={false}
        owner={active ? { ...active.owner } : null}
        social={null}
        showSocialBadge={false}
        description={null}
        videoName={null}
        eventId={null}
        currentTime={currentTime}
        onTimeUpdate={setCurrentTime}
        returnContext={null}
        compactBusinessHeader
        onPrev={() => goToVideoOffset(-1)}
        onNext={() => goToVideoOffset(1)}
        hasPrev={hasPrevVideo}
        hasNext={hasNextVideo}

      />
    </div>
  );
};

export default YouTubeChannelsTabContent;
