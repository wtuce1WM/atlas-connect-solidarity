// Pure helpers extracted from src/pages/Home.tsx for reusability and to keep the page lean.

export const CITIES = ["Marrakech", "Essaouira"] as const;
export type City = typeof CITIES[number];

export const HOME_ID = "__home__";
export const VLOGS_ID = "__vlogs__";

export interface OwnerInfo {
  id: string;
  name: string;
  logo_url: string | null;
  logo_bg: string | null;
  affiliate_id?: string | null;
}

export interface SocialInfo {
  platform: "instagram" | "tiktok" | "youtube";
  account: string;
  url: string | null;
}

export function deriveThumbnail(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`;
  const bunny = url.match(/iframe\.mediadelivery\.net\/embed\/(\d+\/)?([\w-]+)/);
  if (bunny) return `https://vz-${bunny[1]}.b-cdn.net/${bunny[2]}/thumbnail.jpg`;
  return null;
}

export const isAgendaLabel = (label: string) => label.trim().toLowerCase() === "agenda";

export const formatEventDateRange = (start: string | null, end: string | null) => {
  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  if (start && end && start !== end) return `${fmt(start)} → ${fmt(end)}`;
  if (start) return fmt(start);
  if (end) return fmt(end);
  return null;
};

export const DAY_LABEL_FR: Record<string, string> = {
  monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi", thursday: "Jeudi",
  friday: "Vendredi", saturday: "Samedi", sunday: "Dimanche",
  lundi: "Lundi", mardi: "Mardi", mercredi: "Mercredi", jeudi: "Jeudi",
  vendredi: "Vendredi", samedi: "Samedi", dimanche: "Dimanche",
};

export const formatDaysOfWeek = (days: string[] | null | undefined): string | null => {
  if (!days || days.length === 0) return null;
  return days.map((d) => DAY_LABEL_FR[d.toLowerCase()] || d).join(" · ");
};

export const formatTimeRange = (start: string | null, end: string | null): string | null => {
  const trim = (t: string) => t.length >= 5 ? t.slice(0, 5) : t;
  if (!start && !end) return null;
  if (start && end) return `${trim(start)} → ${trim(end)}`;
  return start ? trim(start) : (end ? trim(end) : null);
};

export function extractSocial(d: any): SocialInfo | null {
  const ig = (d?.instagram_account || "").trim();
  if (ig) return { platform: "instagram", account: ig.replace(/^@+/, ""), url: d?.instagram_url || null };
  const tt = (d?.tiktok_account || "").trim();
  if (tt) return { platform: "tiktok", account: tt.replace(/^@+/, ""), url: d?.tiktok_url || null };
  const yt = (d?.youtube_account || "").trim();
  if (yt) return { platform: "youtube", account: yt.replace(/^@+/, ""), url: d?.youtube_url || null };
  return null;
}

export const getVideoBusinessCandidateIds = (d: any): string[] =>
  [d?.linked_business_id, d?.business_id, d?.poi_id].filter(Boolean) as string[];

export const resolveVideoEstablishment = (d: any, bizMap: Map<string, any>) => {
  const candidates = getVideoBusinessCandidateIds(d)
    .map((id) => bizMap.get(id))
    .filter(Boolean);
  return candidates.find((b: any) => b.is_poi !== true) || candidates[0] || null;
};

export function normalizeSocialAccount(value?: string | null): string {
  const raw = (value || "").trim().toLowerCase();
  if (!raw) return "";
  try {
    const url = raw.startsWith("http") ? new URL(raw) : null;
    const path = url ? url.pathname : raw;
    return path.split("/").filter(Boolean)[0]?.replace(/^@+/, "") || "";
  } catch {
    return raw.split(/[/?#]/)[0].replace(/^@+/, "");
  }
}

export function isDifferentDisplayedBusinessSocial(
  social: SocialInfo | null | undefined,
  business: { instagram_url?: string | null; tiktok_url?: string | null; youtube_url?: string | null } | null | undefined,
): boolean {
  if (!social) return false;
  if (!business) return true;
  const businessUrl = social.platform === "instagram"
    ? (business as any).instagram_url
    : social.platform === "tiktok"
      ? (business as any).tiktok_url
      : (business as any).youtube_url;
  const videoAccount = normalizeSocialAccount(social.account);
  const displayedAccount = normalizeSocialAccount(businessUrl);
  if (!displayedAccount) return !!videoAccount;
  return !!videoAccount && videoAccount !== displayedAccount;
}

export const copyTextSilently = async (text: string) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {}

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
};
