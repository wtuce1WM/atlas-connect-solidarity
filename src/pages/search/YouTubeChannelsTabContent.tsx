import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { YouTubeIcon } from "@/components/staff/SocialMediaIcons";
import SlidePanelHome from "@/components/SlidePanelHome";

interface Channel {
  id: string;
  name: string;
  logo_url: string | null;
  youtube_channel_thumbnail_url: string | null;
  youtube_url: string | null;
  city: string | null;
}

interface ThemeGroup {
  themeId: string;
  themeName: string;
  channels: Channel[];
}

interface Props {
  city?: string | null;
  /** Kept for backward compat — no longer used (YouTube tab now opens SlidePanelHome internally). */
  onOpenBusiness?: (businessId: string) => void;
}

interface ActiveVideo {
  videoUrl: string;
  videoName: string | null;
  owner: { id: string; name: string; logo_url: string | null };
}

const YouTubeChannelsTabContent = ({ city }: Props) => {
  const { language } = useLanguage();
  const [groups, setGroups] = useState<ThemeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ActiveVideo | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

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

      let query = supabase
        .from("businesses")
        .select("id, name, logo_url, youtube_channel_thumbnail_url, youtube_url, city")
        .in("id", businessIds)
        .eq("is_active", true)
        .not("youtube_url", "is", null);

      if (city) query = query.eq("city", city);

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
        .map((g) => ({
          ...g,
          channels: [...new Map(g.channels.map((c) => [c.id, c])).values()].sort((a, b) =>
            a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
          ),
        }))
        .sort((a, b) => a.themeName.localeCompare(b.themeName, "fr", { sensitivity: "base" }));

      if (!cancelled) {
        setGroups(final);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [city]);

  const defaultOpen = useMemo(() => groups.map((g) => g.themeId), [groups]);

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
    const pick = rows.find((r) => r.is_short) || rows[0];

    if (!pick) {
      // No video available → fallback: open the channel on YouTube
      if (ch.youtube_url) window.open(ch.youtube_url, "_blank", "noopener,noreferrer");
      return;
    }

    const url = pick.is_short
      ? `https://www.youtube.com/shorts/${pick.video_id}`
      : `https://www.youtube.com/watch?v=${pick.video_id}`;

    setCurrentTime(0);
    setActive({
      videoUrl: url,
      videoName: pick.title,
      owner: { id: ch.id, name: ch.name, logo_url: ch.logo_url },
    });
  };

  if (loading) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground" style={{ fontFamily: "'Roboto', sans-serif" }}>
        {language === "en" ? "Loading channels…" : "Chargement des chaînes…"}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground" style={{ fontFamily: "'Roboto', sans-serif" }}>
        {language === "en" ? "No YouTube channels found." : "Aucune chaîne YouTube trouvée."}
      </div>
    );
  }

  return (
    <div className={`px-4 pt-16 pb-4 transition-all duration-300 ${active ? "lg:max-w-[50vw] lg:mr-auto lg:ml-0" : "max-w-5xl mx-auto"}`}>
      <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-2">
        {groups.map((g) => (
          <AccordionItem key={g.themeId} value={g.themeId} className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <YouTubeIcon className="h-4 w-4 text-red-600" />
                <span className="font-semibold" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
                  {g.themeName}
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">
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
                      {ch.logo_url ? (
                        <img src={ch.logo_url} alt={ch.name} className="w-full h-full object-cover" loading="lazy" />
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
                      className="text-[11px] text-center text-foreground leading-tight break-words"
                      style={{ fontFamily: "'Roboto', sans-serif" }}
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

      <SlidePanelHome
        open={!!active}
        onClose={() => setActive(null)}
        videoUrl={active?.videoUrl || null}
        videoId={null}
        businessName={active?.owner.name || ""}
        pageBusinessId={active?.owner.id || null}
        isGeneric={false}
        owner={active ? { ...active.owner } : null}
        social={null}
        showSocialBadge={false}
        description={null}
        videoName={active?.videoName || null}
        eventId={null}
        currentTime={currentTime}
        onTimeUpdate={setCurrentTime}
        returnContext={null}
      />
    </div>
  );
};

export default YouTubeChannelsTabContent;
