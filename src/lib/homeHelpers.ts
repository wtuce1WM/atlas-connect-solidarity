// Pure helpers extracted from src/pages/Home.tsx for reusability and to keep the page lean.

export const CITIES = ["Marrakech", "Essaouira"] as const;
export type City = typeof CITIES[number];

export const HOME_ID = "__home__";
export const VLOGS_ID = "__vlogs__";

/**
 * Cities considered as belonging to a parent city for the homepage scope.
 * Agafay, Asni and Imlil are areas near Marrakech and should appear under Marrakech.
 */
const CITY_ALIASES: Record<string, string[]> = {
  Marrakech: ["Marrakech", "Agafay", "Asni", "Imlil"],
  Essaouira: ["Essaouira"],
};

/** Return the city plus its homepage aliases (e.g. Marrakech → [Marrakech, Agafay, Asni, Imlil]). */
export function getCityAliases(city: string): string[] {
  return CITY_ALIASES[city] || [city];
}

export function cityMatches(docCity: string | null | undefined, city: string): boolean {
  if (!docCity) return false;
  const aliases = getCityAliases(city);
  return aliases.some((c) => c.toLowerCase() === docCity.toLowerCase());
}

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

export const isAgendaLabel = (label: string) => {
  const l = label.trim().toLowerCase();
  return l === "agenda" || l === "#agenda";
};

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

function buildSocialUrl(
  platform: "instagram" | "tiktok" | "youtube",
  account: string,
  rawUrl: string | null | undefined,
): string {
  const handle = account.replace(/^@+/, "").trim();
  const raw = (rawUrl || "").trim();
  // If raw URL is absolute and well-formed, use it as-is
  if (/^https?:\/\//i.test(raw)) {
    try {
      // Validate
      // eslint-disable-next-line no-new
      new URL(raw);
      return raw;
    } catch {
      /* fallthrough to rebuild */
    }
  }
  // Rebuild a canonical URL from the handle
  switch (platform) {
    case "instagram":
      return `https://www.instagram.com/${handle}/`;
    case "tiktok":
      return `https://www.tiktok.com/@${handle}`;
    case "youtube":
      return handle.startsWith("UC")
        ? `https://www.youtube.com/channel/${handle}`
        : `https://www.youtube.com/@${handle}`;
  }
}

export function extractSocial(d: any): SocialInfo | null {
  const ig = (d?.instagram_account || "").trim();
  if (ig) {
    const account = ig.replace(/^@+/, "");
    return { platform: "instagram", account, url: buildSocialUrl("instagram", account, d?.instagram_url) };
  }
  const tt = (d?.tiktok_account || "").trim();
  if (tt) {
    const account = tt.replace(/^@+/, "");
    return { platform: "tiktok", account, url: buildSocialUrl("tiktok", account, d?.tiktok_url) };
  }
  const yt = (d?.youtube_account || "").trim();
  if (yt) {
    const account = yt.replace(/^@+/, "");
    return { platform: "youtube", account, url: buildSocialUrl("youtube", account, d?.youtube_url) };
  }
  return null;
}

export const getVideoBusinessCandidateIds = (d: any, opts?: { strict?: boolean }): string[] =>
  (opts?.strict
    ? [d?.business_id, d?.poi_id]
    : [d?.linked_business_id, d?.business_id, d?.poi_id]
  ).filter(Boolean) as string[];

export const resolveVideoEstablishment = (
  d: any,
  bizMap: Map<string, any>,
  opts?: { strict?: boolean },
) => {
  const candidates = getVideoBusinessCandidateIds(d, opts)
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
  business: any | null | undefined,
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
