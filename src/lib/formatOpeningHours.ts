/**
 * Shared helper to format a single day's opening hours for display.
 * Supports dual time slots (open/close + open2/close2).
 */

export interface DayHoursData {
  open?: string;
  close?: string;
  open2?: string;
  close2?: string;
  closed?: boolean;
  continuous?: boolean;
}

/**
 * Format a day's hours into a display string.
 * Returns "Fermé" / "Closed" / "مغلق" if closed.
 * Shows two slots separated by " / " if open2+close2 are set.
 */
export function formatDayHours(
  dh: DayHoursData | null | undefined,
  options?: { language?: string; showContinuous?: boolean }
): string {
  const lang = options?.language || "fr";
  const showCont = options?.showContinuous !== false;

  if (!dh) return "—";
  if (dh.closed) {
    return lang === "en" ? "Closed" : lang === "ar" ? "مغلق" : "Fermé";
  }

  if (!dh.open || !dh.close) return "—";

  let result = `${dh.open} - ${dh.close}`;

  if (dh.continuous && showCont) {
    const contLabel = lang === "en" ? " (continuous)" : lang === "ar" ? " (متواصل)" : " (continu)";
    result += contLabel;
  }

  // Add second slot if present
  if (dh.open2 && dh.close2 && !dh.continuous) {
    result += ` / ${dh.open2} - ${dh.close2}`;
  }

  return result;
}

/**
 * Returns the current time in Morocco (Africa/Casablanca, UTC+1, no DST)
 * as { minutes, dayOfWeek } where dayOfWeek matches Date.getDay() (0=Sun).
 * Business opening hours stored in DB are local Morocco time.
 */
export function getMoroccoNow(): { minutes: number; dayOfWeek: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Casablanca",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  let h = parseInt(get("hour"), 10);
  if (h === 24) h = 0; // some locales output "24" for midnight
  const m = parseInt(get("minute"), 10);
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dayOfWeek = weekdayMap[get("weekday")] ?? new Date().getDay();
  return { minutes: h * 60 + m, dayOfWeek };
}

/**
 * Check if the business is currently open, supporting dual slots.
 * Uses Morocco local time (Africa/Casablanca) regardless of user timezone.
 */
export function isCurrentlyOpen(
  dh: DayHoursData | null | undefined
): boolean {
  if (!dh || dh.closed) return false;
  if (!dh.open || !dh.close) return false;

  const nowMinutes = getMoroccoNow().minutes;

  // Check slot 1
  const [oh, om] = dh.open.split(":").map(Number);
  const [ch, cm] = dh.close.split(":").map(Number);
  const openMin = oh * 60 + (om || 0);
  const closeMin = ch * 60 + (cm || 0);

  const inSlot1 = closeMin > openMin
    ? nowMinutes >= openMin && nowMinutes < closeMin
    : nowMinutes >= openMin || nowMinutes < closeMin;

  if (inSlot1) return true;

  // Check slot 2
  if (dh.open2 && dh.close2 && !dh.continuous) {
    const [oh2, om2] = dh.open2.split(":").map(Number);
    const [ch2, cm2] = dh.close2.split(":").map(Number);
    const openMin2 = oh2 * 60 + (om2 || 0);
    const closeMin2 = ch2 * 60 + (cm2 || 0);

    const inSlot2 = closeMin2 > openMin2
      ? nowMinutes >= openMin2 && nowMinutes < closeMin2
      : nowMinutes >= openMin2 || nowMinutes < closeMin2;

    if (inSlot2) return true;
  }

  return false;
}
