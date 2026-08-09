// Extrait verbatim de supabase/functions/embed-ai-chat/index.ts (moteur A/B/C, étape 3).
// Aucune réécriture : le rendu est déjà validé en production.

export function pickLang(v: unknown): "fr" | "en" | "ar" {
  return v === "en" || v === "ar" ? v : "fr";
}

export function fmtHours(oh: any): string {
  if (!oh || typeof oh !== "object") return "";
  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const keys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const lines: string[] = [];
  keys.forEach((k, i) => {
    const d = oh[k]; if (!d) return;
    if (d.closed) { lines.push(`${days[i]}: fermé`); return; }
    const slots = Array.isArray(d.slots) ? d.slots : [];
    const parts = slots.filter((s: any) => s?.open && s?.close).map((s: any) => `${s.open}–${s.close}`);
    if (parts.length) lines.push(`${days[i]}: ${parts.join(", ")}`);
  });
  return lines.join(" · ");
}

export const normalize = (s: any) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  const v0 = new Array(bl + 1);
  const v1 = new Array(bl + 1);
  for (let i = 0; i <= bl; i++) v0[i] = i;
  for (let i = 0; i < al; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < bl; j++) {
      const cost = a.charCodeAt(i) === b.charCodeAt(j) ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= bl; j++) v0[j] = v1[j];
  }
  return v0[bl];
}

export const DAY_LABELS = {
  fr: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  ar: ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"],
};

export const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export async function fetchPriorFull(admin: any, ids: string[]): Promise<any[]> {
  if (!ids.length) return [];
  const { data } = await admin.from("businesses").select(
    "id, name, slug, city, neighborhood, address, main_category, latitude, longitude, logo_url, images, computed_rating, rating, total_review_count, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, engagements, opening_hours, is_open_24h, vacation_dates, show_opening_hours"
  ).in("id", ids.slice(0, 30));
  return Array.isArray(data) ? data : [];
}

export function orderByIds<T extends { id: string }>(arr: T[], ids: string[]): T[] {
  const map = new Map(arr.map((x) => [x.id, x]));
  const out: T[] = [];
  for (const id of ids) { const v = map.get(id); if (v) out.push(v); }
  return out;
}

export function fmtKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : Number.isInteger(km) ? `${km} km` : `${km.toFixed(1)} km`;
}

export function toMapMarker(businesses: any[], title: string | null = null): string {
  const mapBusinesses = businesses.slice(0, 20).map((p: any) => ({
    id: p.id, slug: p.slug, name: p.name,
    city: p.city, neighborhood: p.neighborhood, address: p.address,
    main_category: p.main_category || "",
    categories: p.main_category ? [p.main_category] : [],
    latitude: p.latitude, longitude: p.longitude,
    logo_url: p.logo_url,
    images: Array.isArray(p.images) ? p.images : [],
    google_rating: p.google_rating, google_review_count: p.google_review_count,
    tripadvisor_rating: p.tripadvisor_rating, tripadvisor_review_count: p.tripadvisor_review_count,
    engagements: p.engagements,
  }));
  return `\n\n<!--SHOW_ON_MAP:${JSON.stringify({ title, businesses: mapBusinesses })}-->`;
}

export function haversineKmLocal(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
