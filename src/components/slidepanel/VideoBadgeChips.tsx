import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { YouTubeIcon } from "@/components/staff/SocialMediaIcons";

/**
 * Source de vérité unique du bloc de chips badges affiché en haut de la vidéo.
 * Utilisé par le viewer immersif (VideoSlidePanel) ET par la vue vidéo de la
 * fiche business, sans mécanisme parallèle.
 */

export type VideoChipBadge = {
  id: string;
  name: string;
  color?: string | null;
  text_color?: string | null;
};

const capFirstBadgeLabel = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Menu fixe de filtres : seuls les libellés sont figés, les couleurs viennent du back-office (table badges). */
export const LEFT_COLUMN_BADGES = [
  { id: "09c54af9-2263-4ee5-aaf4-43d520a95fdc", label: "Points d'intérêt" },
  { id: "226a6dcd-f53b-4408-ac97-16d083cb4f98", label: "Guide" },
  { id: "9c1409d9-1213-4a6f-9a2b-5984b9af227c", label: "Famille" },
  { id: "645463af-f0a1-41f4-90c0-b79c5c74a09f", label: "Enfants" },
  { id: "094e01b8-c2dc-47f8-838d-5bfd01d0eefc", label: "Annonces" },
  { id: "4c5cb867-0a4e-4a44-bb4d-81f163116a54", label: "Immobilier" },
  { id: "e042e0e8-e188-4f35-9cdd-282f8ddc5106", label: "Day Pass" },
  { id: "651cb1af-63ee-4bc5-88cf-aea10a7d68c8", label: "Avis clients" },
  { id: "50472b39-d364-497f-afe7-d2aa46eb92c9", label: "Agenda" },
  { id: "3454814c-df50-414e-b5e1-70fc3976cb30", label: "Recettes" },
];

export const CITY_FEED_BADGES = [
  { id: "41545fd3-2c2c-4609-8d55-842fd7e2edde", name: "Marrakech" },
  { id: "3f96c12a-0635-4f70-8de0-2578a66bcc07", name: "Essaouira" },
];

/**
 * Lecture directe des badges d'une vidéo par ID dans les 3 tables de liaison,
 * quel que soit le parcours d'ouverture (feed, suggestion badge, fiche).
 */
export function useVideoBadges(enabled: boolean, videoId?: string | null) {
  const [selfBadges, setSelfBadges] = useState<{ videoId: string; badges: VideoChipBadge[] } | null>(null);
  useEffect(() => {
    if (!enabled || !videoId) return;
    let cancelled = false;
    (async () => {
      const badgeSelect = "badges!inner(id, name_fr, color_hex, text_color_hex, is_active_on_front)";
      const [docs, gens, yts] = await Promise.all([
        (supabase as any).from("business_document_badges").select(badgeSelect).eq("document_id", videoId),
        (supabase as any).from("generic_video_badges").select(badgeSelect).eq("generic_video_id", videoId),
        (supabase as any).from("business_youtube_video_badges").select(badgeSelect).eq("youtube_video_id", videoId),
      ]);
      if (cancelled) return;
      const out = new Map<string, VideoChipBadge>();
      for (const res of [docs, gens, yts]) {
        for (const row of ((res as any)?.data || []) as any[]) {
          const b = row.badges;
          if (!b?.id || !b.is_active_on_front) continue;
          out.set(String(b.id), { id: String(b.id), name: String(b.name_fr || ""), color: b.color_hex ?? null, text_color: b.text_color_hex ?? null });
        }
      }
      setSelfBadges({ videoId: String(videoId), badges: Array.from(out.values()) });
    })();
    return () => { cancelled = true; };
  }, [enabled, videoId]);

  return useMemo(() => {
    if (!selfBadges || selfBadges.videoId !== String(videoId ?? "")) return null;
    return selfBadges.badges.length ? selfBadges.badges : null;
  }, [selfBadges, videoId]);
}

interface VideoBadgeChipsProps {
  /** Badges de la vidéo courante (fusion feed + lecture par ID). */
  badges: VideoChipBadge[] | null;
  expanded: boolean;
  onExpandedChange: (v: boolean) => void;
  selectedBadgeId?: string | null;
  onFeedBadgeSelect?: (badge: { id: string; name: string }) => void;
  onFeedCitySelect?: (city: { id: string; name: string }) => void;
  onFeedYouTubeSelect?: () => void;
  isYouTubeUrl?: boolean;
  /** Repli utilisé si aucun handler YouTube : fermer puis naviguer vers /youtube. */
  onClose?: () => void;
}

const VideoBadgeChips = ({
  badges,
  expanded,
  onExpandedChange,
  selectedBadgeId,
  onFeedBadgeSelect,
  onFeedCitySelect,
  onFeedYouTubeSelect,
  isYouTubeUrl,
  onClose,
}: VideoBadgeChipsProps) => {
  const navigate = useNavigate();
  const chipsBadges = badges;
  const setChipsExpanded = onExpandedChange;
  const [pinnedBadge, setPinnedBadge] = useState<{ id: string; name: string; color?: string | null; textColor?: string | null } | null>(null);

  /** Couleurs des badges du menu fixe, lues en back-office (aucune couleur codée en dur). */
  const [menuBadgeColors, setMenuBadgeColors] = useState<Record<string, { color: string | null; textColor: string | null }>>({});
  const [menuBadgeActive, setMenuBadgeActive] = useState<Record<string, boolean> | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("badges")
        .select("id,color_hex,text_color_hex,is_active_on_front")
        .in("id", LEFT_COLUMN_BADGES.map((b) => b.id));
      if (cancelled || !data) return;
      const map: Record<string, { color: string | null; textColor: string | null }> = {};
      const active: Record<string, boolean> = {};
      for (const row of data as any[]) {
        map[row.id] = { color: row.color_hex, textColor: row.text_color_hex };
        active[row.id] = !!row.is_active_on_front;
      }
      setMenuBadgeColors(map);
      setMenuBadgeActive(active);
    })();
    return () => { cancelled = true; };
  }, []);
  const visibleLeftColumnBadges = menuBadgeActive
    ? LEFT_COLUMN_BADGES.filter((b) => menuBadgeActive[b.id])
    : LEFT_COLUMN_BADGES;

  return (
    <div className="absolute top-16 left-1.5 right-1.5 md:left-3 md:right-3 z-[100] pointer-events-none">
      {!expanded && (() => {
        // Badge « vitrine » : en priorité un badge avec une couleur spécifique
        // (back-office), sinon n'importe lequel.
        const hasSpecificColor = (c?: string | null) => {
          const v = String(c || "").trim().toLowerCase();
          return !!v && v !== "#000000" && v !== "#000" && v !== "#ffffff" && v !== "#fff";
        };
        const pick = (pinnedBadge
          ? { id: pinnedBadge.id, name: pinnedBadge.name, color: pinnedBadge.color, text_color: pinnedBadge.textColor }
          : chipsBadges?.find((b) => hasSpecificColor(b.color)) || chipsBadges?.[0]) || null;
        return (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setChipsExpanded(true)}
              className="pointer-events-auto inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/25 px-3 py-1 text-[11px] md:text-xs font-semibold normal-case tracking-normal shadow-lg backdrop-blur-md transition-transform active:scale-95"
              style={{
                backgroundColor: pick?.color || "rgba(0,0,0,0.7)",
                color: pick?.text_color || "#FFFFFF",
                fontFamily: "'Montserrat',system-ui,sans-serif",
              }}
              title="Voir tous les badges"
            >
              {capFirstBadgeLabel(pick?.name || "Badges")}
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            </button>
          </div>
        );
      })()}
      {expanded && (
        <div className="grid grid-cols-3 gap-1 md:gap-2">

          <div className="flex flex-col items-center justify-start gap-0.5">
            {visibleLeftColumnBadges.filter(
              (b) => !(chipsBadges?.[0]?.id && b.id === chipsBadges[0].id)
            ).map((b) => {
              const isSelected = selectedBadgeId && b.id === selectedBadgeId;
              return (
                <button
                  key={b.id}
                  type="button"
                  disabled={!onFeedBadgeSelect}
                  onClick={() => {
                    setPinnedBadge({ id: b.id, name: b.label, color: menuBadgeColors[b.id]?.color, textColor: menuBadgeColors[b.id]?.textColor });
                    setChipsExpanded(false);
                    onFeedBadgeSelect?.({ id: b.id, name: b.label });
                  }}
                  className={`pointer-events-auto inline-flex max-w-full items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] md:text-xs font-semibold normal-case tracking-normal shadow-lg backdrop-blur-md transition-transform active:scale-95 ${
                    isSelected ? "border-gold bg-gold text-gold-foreground" : "border-white/25"
                  }`}
                  style={
                    isSelected
                      ? { fontFamily: "'Montserrat',system-ui,sans-serif" }
                      : {
                          backgroundColor: menuBadgeColors[b.id]?.color || "rgba(0,0,0,0.7)",
                          color: menuBadgeColors[b.id]?.textColor || "#FFFFFF",
                          fontFamily: "'Montserrat',system-ui,sans-serif",
                        }
                  }
                  title={onFeedBadgeSelect ? `Voir les vidéos ${b.label}` : b.label}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col items-center justify-start gap-0.5">
            {(() => {
              const firstVideoBadge = chipsBadges?.[0];
              const dynamicBadges = chipsBadges?.slice(1).filter((b) => {
                const left = LEFT_COLUMN_BADGES.find((lb) => lb.id === b.id);
                if (left) return false;
                return !LEFT_COLUMN_BADGES.some((lb) => lb.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === b.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
              }) ?? [];
              return (
                <>
                  {firstVideoBadge && (
                    <button
                      key={firstVideoBadge.id}
                      type="button"
                      disabled={!onFeedBadgeSelect}
                      onClick={() => {
                        setPinnedBadge({ id: firstVideoBadge.id, name: firstVideoBadge.name, color: firstVideoBadge.color, textColor: firstVideoBadge.text_color });
                        setChipsExpanded(false);
                        onFeedBadgeSelect?.({ id: firstVideoBadge.id, name: firstVideoBadge.name });
                      }}
                      className="pointer-events-auto inline-flex max-w-full items-center justify-center rounded-full border border-white/25 px-2.5 py-0.5 text-[11px] md:text-xs font-semibold normal-case tracking-normal text-white shadow-lg backdrop-blur-md transition-transform active:scale-95"
                      style={{
                        backgroundColor: firstVideoBadge.color || "rgba(0,0,0,0.7)",
                        color: firstVideoBadge.text_color || "#FFFFFF",
                        fontFamily: "'Montserrat',system-ui,sans-serif",
                      }}
                      title={onFeedBadgeSelect ? `Voir les vidéos ${firstVideoBadge.name}` : firstVideoBadge.name}
                    >
                      {firstVideoBadge.name === "Rooftop Restaurant & Bars" ? (
                        <>Rooftop<br />Restaurant &amp; Bars</>
                      ) : (
                        capFirstBadgeLabel(firstVideoBadge.name)
                      )}
                    </button>
                  )}
                  {dynamicBadges.map((b) => {
                    const isSelected = selectedBadgeId && b.id === selectedBadgeId;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        disabled={!onFeedBadgeSelect}
                        onClick={() => {
                          setPinnedBadge({ id: b.id, name: b.name, color: b.color, textColor: b.text_color });
                          setChipsExpanded(false);
                          onFeedBadgeSelect?.({ id: b.id, name: b.name });
                        }}
                        className={`pointer-events-auto inline-flex max-w-full items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] md:text-xs font-semibold normal-case tracking-normal shadow-lg backdrop-blur-md transition-transform active:scale-95 ${
                          isSelected ? "border-gold bg-gold text-gold-foreground" : "border-white/25 text-white"
                        }`}
                        style={
                          isSelected
                            ? { fontFamily: "'Montserrat',system-ui,sans-serif" }
                            : {
                                backgroundColor: b.color || "rgba(0,0,0,0.7)",
                                color: b.text_color || "#FFFFFF",
                                fontFamily: "'Montserrat',system-ui,sans-serif",
                              }
                        }
                        title={onFeedBadgeSelect ? `Voir les vidéos ${b.name}` : b.name}
                      >
                        {b.name === "Rooftop Restaurant & Bars" ? (
                          <>Rooftop<br />Restaurant &amp; Bars</>
                        ) : (
                          capFirstBadgeLabel(b.name)
                        )}
                      </button>
                    );
                  })}
                  {isYouTubeUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setPinnedBadge({ id: "youtube", name: "YouTube", color: "#FF0000", textColor: "#FFFFFF" });
                        setChipsExpanded(false);
                        if (onFeedYouTubeSelect) {
                          onFeedYouTubeSelect();
                          return;
                        }
                        onClose?.();
                        navigate("/youtube");
                      }}
                      className="pointer-events-auto inline-flex max-w-full items-center justify-center gap-1 rounded-full border border-white/25 px-2.5 py-0.5 text-[11px] md:text-xs font-semibold normal-case tracking-normal text-white shadow-lg backdrop-blur-md transition-transform active:scale-95"
                      style={{ backgroundColor: "#FF0000", fontFamily: "'Montserrat',system-ui,sans-serif" }}
                      title="Voir le feed YouTube"
                    >
                      <YouTubeIcon className="h-3 w-3 shrink-0" />
                      YouTube
                    </button>
                  )}
                </>
              );
            })()}
          </div>
          <div className="flex flex-col items-center justify-start gap-0.5">
            {CITY_FEED_BADGES.map((city) => (
              <button
                key={city.id}
                type="button"
                disabled={!onFeedCitySelect}
                onClick={() => {
                  setPinnedBadge({ id: city.id, name: city.name, color: null, textColor: null });
                  setChipsExpanded(false);
                  onFeedCitySelect?.(city);
                }}
                className="pointer-events-auto inline-flex max-w-full items-center justify-center gap-1 rounded-full border border-white/25 bg-black/70 px-2.5 py-0.5 text-[11px] md:text-xs font-semibold normal-case tracking-normal text-white shadow-lg backdrop-blur-md transition-transform active:scale-95"
                style={{ fontFamily: "'Montserrat',system-ui,sans-serif" }}
                title={onFeedCitySelect ? `Voir les vidéos à ${city.name}` : city.name}
              >
                <MapPin className="h-3 w-3 shrink-0" />
                {city.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {expanded && (
        <div className="mt-2 flex flex-col items-center">
          <button
            type="button"
            onClick={() => setChipsExpanded(false)}
            className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/70 px-3 py-1 text-[11px] md:text-xs font-semibold text-white shadow-lg backdrop-blur-md transition-transform active:scale-95"
            style={{ fontFamily: "'Montserrat',system-ui,sans-serif" }}
            title="Masquer les badges"
          >
            <ChevronUp className="h-3.5 w-3.5 shrink-0" />
            Masquer
          </button>
          <div
            role="button"
            aria-label="Masquer les badges"
            onClick={(e) => { e.stopPropagation(); setChipsExpanded(false); }}
            onTouchEnd={(e) => { e.stopPropagation(); setChipsExpanded(false); }}
            className="pointer-events-auto h-[55vh] w-full"
            title="Taper en dessous pour masquer les badges"
          />
        </div>
      )}
    </div>
  );
};

export default VideoBadgeChips;
