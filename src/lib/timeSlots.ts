/**
 * Time-aware search utilities.
 * Detects temporal keywords in queries and maps them to target time slots.
 * Used to filter/boost businesses whose opening_hours cover the target slot.
 */

export interface TimeSlot {
  /** Start hour (0-23) */
  startHour: number;
  /** End hour (0-23), can be < startHour for overnight */
  endHour: number;
  /** Day offset from today: 0 = today, 1 = tomorrow */
  dayOffset: number;
  /** Specific day of week override (0=Sun..6=Sat), null = use dayOffset from today */
  dayOfWeek: number | null;
  /** The matched keyword (for display/debug) */
  matchedKeyword: string;
  /** Suggested category to boost (optional) */
  suggestedCategory?: string;
}

interface TemporalPattern {
  /** Regex patterns to match (case-insensitive) */
  patterns: RegExp[];
  /** Target time slot */
  slot: Omit<TimeSlot, "matchedKeyword">;
}

const TEMPORAL_PATTERNS: TemporalPattern[] = [
  // Specific meal times
  {
    patterns: [/\bpetit[- ]?déj(euner)?\b/i, /\bbreakfast\b/i, /\bفطور\b/],
    slot: { startHour: 7, endHour: 11, dayOffset: 0, dayOfWeek: null, suggestedCategory: "Restauration" },
  },
  {
    patterns: [/\bbrunch\b/i],
    slot: { startHour: 10, endHour: 14, dayOffset: 0, dayOfWeek: null, suggestedCategory: "Restauration" },
  },
  {
    patterns: [/\bmidi\b/i, /\bdéjeuner\b/i, /\blunch\b/i, /\bغداء\b/],
    slot: { startHour: 12, endHour: 14, dayOffset: 0, dayOfWeek: null, suggestedCategory: "Restauration" },
  },
  {
    patterns: [/\bgoûter\b/i, /\bgouter\b/i, /\baprès[- ]?midi\b/i, /\bafternoon\b/i, /\bبعد الظهر\b/],
    slot: { startHour: 14, endHour: 18, dayOffset: 0, dayOfWeek: null },
  },
  {
    patterns: [/\bapéro\b/i, /\bapero\b/i, /\bhappy\s*hour\b/i],
    slot: { startHour: 17, endHour: 20, dayOffset: 0, dayOfWeek: null, suggestedCategory: "Restauration" },
  },
  {
    patterns: [/\bdîner\b/i, /\bdiner\b/i, /\bsouper\b/i, /\bdinner\b/i, /\bعشاء\b/],
    slot: { startHour: 19, endHour: 23, dayOffset: 0, dayOfWeek: null, suggestedCategory: "Restauration" },
  },
  // General time of day
  {
    patterns: [/\bmatin\b/i, /\bmorning\b/i, /\bصباح\b/],
    slot: { startHour: 8, endHour: 12, dayOffset: 0, dayOfWeek: null },
  },
  {
    patterns: [/\bce\s+soir\b/i, /\bsoir\b/i, /\bsoirée\b/i, /\bevening\b/i, /\btonight\b/i, /\bمساء\b/, /\bالليلة\b/],
    slot: { startHour: 19, endHour: 23, dayOffset: 0, dayOfWeek: null },
  },
  {
    patterns: [/\bnuit\b/i, /\bnight\b/i, /\bnocturne\b/i, /\bليل\b/],
    slot: { startHour: 22, endHour: 6, dayOffset: 0, dayOfWeek: null },
  },
  // "Maintenant" / "now" — uses current time
  {
    patterns: [/\bmaintenant\b/i, /\btout de suite\b/i, /\bnow\b/i, /\bالآن\b/, /\bouvert\b/i, /\bopen\b/i],
    slot: { startHour: -1, endHour: -1, dayOffset: 0, dayOfWeek: null }, // -1 = use current time
  },
  // Tomorrow
  {
    patterns: [/\bdemain\s+matin\b/i, /\btomorrow\s+morning\b/i],
    slot: { startHour: 8, endHour: 12, dayOffset: 1, dayOfWeek: null },
  },
  {
    patterns: [/\bdemain\s+midi\b/i],
    slot: { startHour: 12, endHour: 14, dayOffset: 1, dayOfWeek: null, suggestedCategory: "Restauration" },
  },
  {
    patterns: [/\bdemain\s+soir\b/i, /\btomorrow\s+(evening|night)\b/i],
    slot: { startHour: 19, endHour: 23, dayOffset: 1, dayOfWeek: null },
  },
  {
    patterns: [/\bdemain\b/i, /\btomorrow\b/i, /\bغدا\b/],
    slot: { startHour: 8, endHour: 22, dayOffset: 1, dayOfWeek: null },
  },
];

/**
 * Extract a temporal keyword from a search query and return the associated time slot.
 * Returns null if no temporal keyword is found.
 * Also returns the cleaned query with the temporal keyword removed.
 */
export function extractTimeSlot(query: string): { timeSlot: TimeSlot; cleanedQuery: string } | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  for (const { patterns, slot } of TEMPORAL_PATTERNS) {
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        // Resolve "now" to current time
        let resolvedSlot = { ...slot };
        if (slot.startHour === -1) {
          const now = new Date();
          resolvedSlot.startHour = now.getHours();
          resolvedSlot.endHour = Math.min(now.getHours() + 2, 23);
        }

        // Remove the matched keyword from the query
        const cleanedQuery = trimmed.replace(pattern, " ").replace(/\s+/g, " ").trim();

        return {
          timeSlot: { ...resolvedSlot, matchedKeyword: match[0] },
          cleanedQuery,
        };
      }
    }
  }

  return null;
}

/**
 * Get the current time-of-day period for contextual suggestions.
 */
export type TimePeriod = "morning" | "midday" | "afternoon" | "evening" | "night";

export function getCurrentTimePeriod(): TimePeriod {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return "morning";
  if (hour >= 11 && hour < 14) return "midday";
  if (hour >= 14 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

/**
 * Get a greeting based on the current time of day.
 */
export function getTimeGreeting(language: string): string {
  const period = getCurrentTimePeriod();
  const greetings: Record<TimePeriod, Record<string, string>> = {
    morning: { fr: "Bonjour ☀️", en: "Good morning ☀️", ar: "صباح الخير ☀️" },
    midday: { fr: "Bon appétit 🍽️", en: "Bon appétit 🍽️", ar: "بالصحة والعافية 🍽️" },
    afternoon: { fr: "Bon après-midi 🌤️", en: "Good afternoon 🌤️", ar: "مساء الخير 🌤️" },
    evening: { fr: "Bonsoir 🌙", en: "Good evening 🌙", ar: "مساء الخير 🌙" },
    night: { fr: "Bonne nuit 🌜", en: "Good night 🌜", ar: "تصبح على خير 🌜" },
  };
  return greetings[period][language] || greetings[period].fr;
}

/**
 * Get the suggested category boost for the current time of day.
 */
export function getTimeSuggestedCategory(): string | null {
  const period = getCurrentTimePeriod();
  switch (period) {
    case "morning": return null; // No strong suggestion
    case "midday": return "Restauration";
    case "afternoon": return "Tourisme";
    case "evening": return "Restauration";
    case "night": return "Hôtellerie";
    default: return null;
  }
}

// Day mapping: JS getDay() → opening_hours key
const JS_DAY_TO_KEY = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/**
 * Check if a business's opening hours overlap with a target time slot.
 * Returns true if the business is open during at least part of the slot.
 */
export function isOpenDuringSlot(
  openingHours: Record<string, { open?: string; close?: string; closed?: boolean; continuous?: boolean }> | null,
  isOpen24h: boolean,
  timeSlot: TimeSlot,
  vacationDates?: Array<{ start_date: string; end_date: string }> | null,
): boolean {
  if (isOpen24h) return true;
  if (!openingHours) return false; // Unknown hours = can't confirm

  // Determine the target day
  const now = new Date();
  let targetDate: Date;
  if (timeSlot.dayOfWeek !== null) {
    // Find next occurrence of that day
    const diff = (timeSlot.dayOfWeek - now.getDay() + 7) % 7;
    targetDate = new Date(now);
    targetDate.setDate(now.getDate() + (diff === 0 ? 0 : diff));
  } else {
    targetDate = new Date(now);
    targetDate.setDate(now.getDate() + timeSlot.dayOffset);
  }

  // Check vacation dates
  if (vacationDates && vacationDates.length > 0) {
    const dateStr = targetDate.toISOString().split("T")[0];
    for (const vd of vacationDates) {
      if (dateStr >= vd.start_date && dateStr <= vd.end_date) return false;
    }
  }

  const dayKey = JS_DAY_TO_KEY[targetDate.getDay()];
  const dh = openingHours[dayKey];

  if (!dh || dh.closed) return false;
  if (!dh.open || !dh.close) return false;

  const [oh, om] = dh.open.split(":").map(Number);
  const [ch, cm] = dh.close.split(":").map(Number);
  const openMin = oh * 60 + (om || 0);
  const closeMin = ch * 60 + (cm || 0);

  const slotStartMin = timeSlot.startHour * 60;
  const slotEndMin = timeSlot.endHour * 60;

  // Handle overnight business hours (close < open, e.g., 20:00-02:00)
  if (closeMin <= openMin) {
    // Business spans midnight: open from openMin..1440 and 0..closeMin
    // Slot overlaps if it touches either range
    return slotEndMin > openMin || slotStartMin < closeMin;
  }

  // Handle overnight slot (e.g., night: 22:00-06:00)
  if (slotEndMin <= slotStartMin) {
    return closeMin > slotStartMin || openMin < slotEndMin;
  }

  // Normal case: overlap check
  return slotStartMin < closeMin && slotEndMin > openMin;
}
