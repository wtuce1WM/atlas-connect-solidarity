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
 * Check if the business is currently open, supporting dual slots.
 */
export function isCurrentlyOpen(
  dh: DayHoursData | null | undefined
): boolean {
  if (!dh || dh.closed) return false;
  if (!dh.open || !dh.close) return false;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

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
