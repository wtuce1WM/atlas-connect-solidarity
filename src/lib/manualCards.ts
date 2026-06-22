import { supabase } from "@/integrations/supabase/client";
import type { City } from "@/lib/homeHelpers";

export interface ManualCardInfo {
  label: string;
  badgeId: string | null;
  eventId?: string | null;
  imageUrl?: string | null;
}

/**
 * In-memory cache of the resolved extra cards + badge metadata per city.
 * Purely cosmetic data (homepage editorial overlays) → safe to cache short-term.
 * Avoids re-querying front_structure_homepage_extra_cards / badges / business_document_badges
 * on every Home navigation within the same session.
 */
interface CityExtraCardsCacheEntry {
  cards: Array<{
    id: string;
    business_id: string | null;
    badge_id: string | null;
    video_document_id: string | null;
    title: string | null;
    sort_order: number | null;
    event_id?: string | null;
    image_url?: string | null;
  }>;
  badgeNameById: Map<string, string>;
  docIdsByBadgeId: Map<string, Set<string>>;
  fetchedAt: number;
}

const EXTRA_CARDS_TTL_MS = 60_000; // 1 minute
const extraCardsCache = new Map<string, CityExtraCardsCacheEntry>();

/** Invalidate the cache (call after back-office edits if needed). */
export function invalidateManualCardCache(city?: City) {
  if (city) extraCardsCache.delete(city);
  else extraCardsCache.clear();
}

async function loadCityExtraCards(city: City): Promise<CityExtraCardsCacheEntry> {
  const cached = extraCardsCache.get(city);
  if (cached && Date.now() - cached.fetchedAt < EXTRA_CARDS_TTL_MS) {
    return cached;
  }

  const { data: extraRows } = await (supabase as any)
    .from("front_structure_homepage_extra_cards")
    .select("id, business_id, badge_id, video_document_id, title, sort_order, event_id, image_url")
    .eq("city", city)
    .order("sort_order", { ascending: true });

  const cards = ((extraRows as any[]) || []) as CityExtraCardsCacheEntry["cards"];

  const badgeIds = Array.from(new Set(cards.map((card) => card.badge_id).filter(Boolean))) as string[];

  const [{ data: badges }, { data: badgeLinks }] = await Promise.all([
    badgeIds.length > 0
      ? supabase.from("badges").select("id, name_fr").in("id", badgeIds)
      : Promise.resolve({ data: [] }),
    badgeIds.length > 0
      ? supabase.from("business_document_badges").select("badge_id, document_id").in("badge_id", badgeIds)
      : Promise.resolve({ data: [] }),
  ]);

  const badgeNameById = new Map<string, string>(
    ((badges as any[]) || []).map((badge: any) => [badge.id, badge.name_fr])
  );
  const docIdsByBadgeId = new Map<string, Set<string>>();
  ((badgeLinks as any[]) || []).forEach((link: any) => {
    const current = docIdsByBadgeId.get(link.badge_id) || new Set<string>();
    current.add(link.document_id);
    docIdsByBadgeId.set(link.badge_id, current);
  });

  const entry: CityExtraCardsCacheEntry = { cards, badgeNameById, docIdsByBadgeId, fetchedAt: Date.now() };
  extraCardsCache.set(city, entry);
  return entry;
}

/**
 * Build a map docId → ManualCardInfo from the homepage extra cards table for a given city.
 * Used by the homepage to overlay manual labels (badges/events) on top of video cards.
 *
 * NOTE: This data is purely cosmetic (editorial overlay on the Home page).
 * It must NEVER influence the actual content of business cards, nor be queried
 * from Category / Sub-category / Search pages.
 */
export async function getManualCardMap(city: City, docs: any[]): Promise<Map<string, ManualCardInfo>> {
  const manualMap = new Map<string, ManualCardInfo>();

  if (docs.length === 0) return manualMap;

  const { cards, badgeNameById, docIdsByBadgeId } = await loadCityExtraCards(city);

  if (cards.length === 0) return manualMap;

  // IMPORTANT: badge_id on extra cards is ONLY used to FILTER which video to pick.
  // It must NEVER be used as the displayed label. Only an explicit `title` is shown.
  const pickLabel = (card: { title: string | null }) => card.title?.trim() || null;

  cards.forEach((card) => {
    const label = pickLabel(card);

    if (card.video_document_id) {
      if (label && !manualMap.has(card.video_document_id)) {
        manualMap.set(card.video_document_id, { label, badgeId: card.badge_id, eventId: card.event_id ?? null });
      }
      return;
    }

    const matchingDocs = docs.filter((doc) => {
      const matchesBusiness = !card.business_id || [doc.business_id, doc.linked_business_id, doc.poi_id].includes(card.business_id);
      const matchesBadge = !card.badge_id || docIdsByBadgeId.get(card.badge_id)?.has(doc.id);
      const matchesEvent = !card.event_id || doc.event_id === card.event_id;
      return matchesBusiness && matchesBadge && matchesEvent;
    });

    if (matchingDocs.length === 0) return;

    const selectedDoc = [...matchingDocs].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];
    if (selectedDoc && label && !manualMap.has(selectedDoc.id)) {
      manualMap.set(selectedDoc.id, { label, badgeId: card.badge_id, eventId: card.event_id ?? null });
    }
  });

  return manualMap;
}
