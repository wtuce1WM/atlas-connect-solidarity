import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { YouTubeIcon } from "@/components/staff/SocialMediaIcons";

interface Channel {
  id: string;
  name: string;
  logo_url: string | null;
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
  onOpenBusiness?: (businessId: string) => void;
}

const YouTubeChannelsTabContent = ({ city, onOpenBusiness }: Props) => {
  const { language } = useLanguage();
  const [groups, setGroups] = useState<ThemeGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Fetch all themes
      const { data: themes } = await supabase
        .from("youtube_themes")
        .select("id, name_fr");

      // Fetch links
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
        .select("id, name, logo_url, youtube_url, city")
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
    <div className="px-4 pt-16 pb-4 max-w-5xl mx-auto">
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
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pt-1 pb-2" style={{ scrollbarWidth: "none" }}>
                {g.channels.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => {
                      if (onOpenBusiness) onOpenBusiness(ch.id);
                      else if (ch.youtube_url) window.open(ch.youtube_url, "_blank", "noopener,noreferrer");
                    }}
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
    </div>
  );
};

export default YouTubeChannelsTabContent;
