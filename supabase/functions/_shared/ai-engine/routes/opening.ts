// Extrait verbatim de supabase/functions/embed-ai-chat/index.ts (moteur A/B/C, étape 3).
// Aucune réécriture : le rendu est déjà validé en production.

import { normalize, DAY_KEYS, DAY_LABELS, fetchPriorFull, orderByIds, fmtKm, toMapMarker } from "./shared.ts";

export function isHoursIntent(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  if (/\b(horaires?|heures? d['\s]?ouverture|ouvert|ouverture|ferme|fermeture|jours? d['\s]?ouverture)\b/i.test(n)) return true;
  if (/\b(opening hours?|open hours?|hours of operation|when (?:are you |is it )?open|what time|closing time)\b/i.test(n)) return true;
  if (/(ساعات|مواعيد|أوقات).*(العمل|الفتح|الدوام)/.test(text)) return true;
  return false;
}

export function buildHoursAnswer(host: any, lang: "fr" | "en" | "ar"): string | null {
  if (host?.show_opening_hours !== true) {
    if (lang === "en") return `The opening hours of **${host.name}** are not published here. The easiest way is to contact the team directly — ${host.phone ? `by phone at ${host.phone}` : host.whatsapp ? `on WhatsApp at ${host.whatsapp}` : "via the contact details on the site"}. Would you like me to help you with something else — a table nearby, a rooftop, an activity?`;
    if (lang === "ar") return `ساعات عمل **${host.name}** غير منشورة هنا. الأفضل التواصل مباشرة مع الفريق${host.phone ? ` عبر الهاتف ${host.phone}` : host.whatsapp ? ` عبر واتساب ${host.whatsapp}` : ""}. هل تريد مساعدة في شيء آخر — مطعم قريب، سطح، أو نشاط؟`;
    return `Les horaires de **${host.name}** ne sont pas publiés ici. Le plus simple est de contacter l'équipe directement${host.phone ? ` au ${host.phone}` : host.whatsapp ? ` sur WhatsApp au ${host.whatsapp}` : " via les coordonnées du site"}. Je peux t'aider sur autre chose — une table à proximité, un rooftop, une activité ?`;
  }
  const oh = host.opening_hours;
  if (!oh || typeof oh !== "object") {
    if (lang === "en") return `The hours of **${host.name}** haven't been filled in yet. Feel free to contact the team directly for the latest.`;
    if (lang === "ar") return `لم تُعبأ ساعات عمل **${host.name}** بعد. يرجى الاتصال بالفريق مباشرة.`;
    return `Les horaires de **${host.name}** ne sont pas encore renseignés. N'hésite pas à contacter l'équipe directement.`;
  }
  const labels = DAY_LABELS[lang];
  const closedWord = lang === "en" ? "Closed" : lang === "ar" ? "مغلق" : "Fermé";
  const lines: string[] = [];
  DAY_KEYS.forEach((k, i) => {
    const d = oh[k];
    if (!d) { lines.push(`- ${labels[i]} — —`); return; }
    if (d.closed) { lines.push(`- ${labels[i]} — ${closedWord}`); return; }
    if (!d.open || !d.close) { lines.push(`- ${labels[i]} — —`); return; }
    let s = `${d.open} – ${d.close}`;
    if (d.open2 && d.close2 && !d.continuous) s += ` / ${d.open2} – ${d.close2}`;
    lines.push(`- ${labels[i]} — ${s}`);
  });
  const intro = lang === "en"
    ? `Here are the opening hours of **${host.name}**:`
    : lang === "ar"
      ? `إليك ساعات عمل **${host.name}**:`
      : `Voici les horaires de **${host.name}** :`;
  const outro = lang === "en"
    ? `\n\nWant me to suggest something to do around **${host.name}** at a specific time of day?`
    : lang === "ar"
      ? `\n\nهل تريد اقتراحات لأنشطة قريبة من **${host.name}** في وقت معين؟`
      : `\n\nJe peux te suggérer une activité autour de **${host.name}** à un moment précis de la journée ?`;
  return `${intro}\n\n${lines.join("\n")}${outro}`;
}

export async function buildHoursForBusinesses(admin: any, ids: string[], lang: "fr" | "en" | "ar"): Promise<string | null> {
  if (!ids.length) return null;
  const { data, error } = await admin
    .from("businesses")
    .select("id, name, slug, city, neighborhood, show_opening_hours, opening_hours, is_open_24h, phone, whatsapp")
    .in("id", ids.slice(0, 20));
  if (error || !Array.isArray(data) || !data.length) return null;

  // Preserve the order of the incoming ids.
  const byId = new Map<string, any>(data.map((b: any) => [b.id, b]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

  const withHours = ordered.filter((b: any) => b.show_opening_hours === true && (b.is_open_24h || (b.opening_hours && typeof b.opening_hours === "object")));
  const withoutHours = ordered.filter((b: any) => !(b.show_opening_hours === true));

  if (!withHours.length && !withoutHours.length) return null;

  const labels = DAY_LABELS[lang];
  const closedWord = lang === "en" ? "Closed" : lang === "ar" ? "مغلق" : "Fermé";
  const open24Word = lang === "en" ? "Open 24/7" : lang === "ar" ? "مفتوح 24/24" : "Ouvert 24h/24";

  // Morocco day-of-week index into DAY_KEYS (which starts Monday).
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Casablanca", weekday: "short" }).formatToParts(new Date());
  const wd = parts.find((p) => p.type === "weekday")?.value || "";
  const wdMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const todayIdx = wdMap[wd] ?? 0;
  const todayKey = DAY_KEYS[todayIdx];
  const todayLabel = labels[todayIdx];

  const formatSlot = (d: any): string => {
    if (!d) return "—";
    if (d.closed) return closedWord;
    if (!d.open || !d.close) return "—";
    let s = `${d.open}–${d.close}`;
    if (d.open2 && d.close2 && !d.continuous) s += ` / ${d.open2}–${d.close2}`;
    return s;
  };

  const formatWeek = (oh: any): string => {
    const chunks: string[] = [];
    DAY_KEYS.forEach((k, i) => {
      const short = labels[i].slice(0, 3);
      chunks.push(`${short} ${formatSlot(oh?.[k])}`);
    });
    return chunks.join(" · ");
  };

  const intro = lang === "en"
    ? `Here are the opening hours for the results above (${todayLabel} first):`
    : lang === "ar"
      ? `إليك ساعات العمل للنتائج السابقة (${todayLabel} أولًا):`
      : `Voici les horaires des résultats ci-dessus (${todayLabel} en premier) :`;

  const blocks: string[] = [];
  for (const b of withHours) {
    const loc = [b.neighborhood, b.city].filter(Boolean).join(", ");
    const header = `**${b.name}**${loc ? ` — ${loc}` : ""}`;
    if (b.is_open_24h) {
      blocks.push(`- ${header} — ${open24Word}`);
      continue;
    }
    const today = formatSlot(b.opening_hours?.[todayKey]);
    const week = formatWeek(b.opening_hours);
    blocks.push(`- ${header}\n  · ${todayLabel} : ${today}\n  · ${week}`);
  }

  let out = `${intro}\n\n${blocks.join("\n")}`;

  if (withoutHours.length) {
    const names = withoutHours.map((b: any) => `**${b.name}**`).join(", ");
    const line = lang === "en"
      ? `\n\nHours are not published here for ${names} — best to contact them directly.`
      : lang === "ar"
        ? `\n\nساعات العمل غير منشورة لـ ${names} — يُفضّل التواصل معهم مباشرة.`
        : `\n\nHoraires non publiés ici pour ${names} — le mieux est de les contacter directement.`;
    out += line;
  }

  const outro = lang === "en"
    ? `\n\nWant me to filter by "open now" or suggest one for a specific time slot?`
    : lang === "ar"
      ? `\n\nهل تريد التصفية حسب "مفتوح الآن" أو اقتراح واحد لوقت معين؟`
      : `\n\nJe filtre sur « ouvert maintenant » ou je t'en propose un pour un créneau précis ?`;
  return out + outro;
}

export function isOpensFirstIntent(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  if (/\b(premier|premiere|1er|1ere).{0,20}(ouvr|ouverture)/.test(n)) return true;
  if (/\bqui ouvre.{0,15}(tot|premier|en premier|le plus tot)/.test(n)) return true;
  if (/\bouvre.{0,10}le plus tot/.test(n)) return true;
  if (/\b(opens? (?:the )?(?:first|earliest)|earliest to open|which .* opens first)\b/i.test(text)) return true;
  if (/(الأول|أول).{0,15}(يفتح|فتح)/.test(text)) return true;
  return false;
}

export function isClosesLastIntent(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  if (/\b(dernier|derniere).{0,20}(ferm)/.test(n)) return true;
  if (/\bqui ferme.{0,15}(tard|dernier|en dernier|le plus tard)/.test(n)) return true;
  if (/\bferme.{0,10}le plus tard/.test(n)) return true;
  if (/\b(closes? (?:the )?(?:last|latest)|latest to close|stays open (?:the )?latest)\b/i.test(text)) return true;
  if (/(الأخير|آخر).{0,15}(يغلق|يقفل|إغلاق)/.test(text)) return true;
  return false;
}

export async function buildHoursRanking(
  admin: any,
  ids: string[],
  mode: "opens_first" | "closes_last",
  lang: "fr" | "en" | "ar",
): Promise<string | null> {
  if (!ids.length) return null;
  const { data, error } = await admin
    .from("businesses")
    .select("id, name, slug, city, neighborhood, show_opening_hours, opening_hours, is_open_24h, vacation_dates")
    .in("id", ids.slice(0, 30));
  if (error || !Array.isArray(data) || !data.length) return null;

  // Morocco day + date
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  }).formatToParts(new Date());
  const wd = parts.find((p) => p.type === "weekday")?.value || "";
  const wdMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const todayIdx = wdMap[wd] ?? 0;
  const todayKey = DAY_KEYS[todayIdx];
  const y = parts.find((p) => p.type === "year")?.value || "";
  const mo = parts.find((p) => p.type === "month")?.value || "";
  const da = parts.find((p) => p.type === "day")?.value || "";
  const todayStr = `${y}-${mo}-${da}`;

  const toMin = (s: string): number | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s || "");
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  };

  type Row = { id: string; name: string; slug: string; city?: string; neighborhood?: string; opens: number; closes: number; is24: boolean };
  const rows: Row[] = [];

  for (const b of data) {
    if (b.show_opening_hours !== true) continue;
    // Vacation check
    if (Array.isArray(b.vacation_dates)) {
      const onVac = b.vacation_dates.some((v: any) => v?.start_date && v?.end_date && todayStr >= v.start_date && todayStr <= v.end_date);
      if (onVac) continue;
    }
    if (b.is_open_24h) {
      rows.push({ id: b.id, name: b.name, slug: b.slug, city: b.city, neighborhood: b.neighborhood, opens: 0, closes: 1440, is24: true });
      continue;
    }
    const oh = b.opening_hours;
    const d = oh?.[todayKey];
    if (!d || d.closed || !d.open || !d.close) continue;
    const o1 = toMin(d.open); const c1 = toMin(d.close);
    if (o1 == null || c1 == null) continue;
    const opens = o1;
    let closes = c1 <= o1 ? c1 + 1440 : c1;
    if (d.open2 && d.close2 && !d.continuous) {
      const c2 = toMin(d.close2);
      if (c2 != null) {
        const c2Adj = c2 <= (toMin(d.open2) ?? 0) ? c2 + 1440 : c2;
        if (c2Adj > closes) closes = c2Adj;
      }
    }
    rows.push({ id: b.id, name: b.name, slug: b.slug, city: b.city, neighborhood: b.neighborhood, opens, closes, is24: false });
  }

  if (!rows.length) {
    if (lang === "en") return `I don't have public hours for the previous results — hard to rank them. Want me to try something else?`;
    if (lang === "ar") return `ليست لديّ ساعات عمل منشورة للنتائج السابقة — يصعب ترتيبها. هل تريد شيئًا آخر؟`;
    return `Je n'ai pas d'horaires publics sur les précédentes adresses — difficile de les classer. Je peux t'aider autrement ?`;
  }

  const sorted = mode === "opens_first"
    ? [...rows].sort((a, b) => (a.is24 ? -1 : b.is24 ? 1 : a.opens - b.opens))
    : [...rows].sort((a, b) => (a.is24 ? -1 : b.is24 ? 1 : b.closes - a.closes));

  const top = sorted.slice(0, Math.min(5, sorted.length));
  const fmt = (m: number) => {
    const mm = ((m % 1440) + 1440) % 1440;
    const h = Math.floor(mm / 60); const min = mm % 60;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  };
  const dayLabel = DAY_LABELS[lang][todayIdx];

  const lines = top.map((r) => {
    const loc = [r.neighborhood, r.city].filter(Boolean).join(", ");
    if (r.is24) {
      const w = lang === "en" ? "Open 24/7" : lang === "ar" ? "مفتوح 24/24" : "Ouvert 24h/24";
      return `- **${r.name}**${loc ? ` — ${loc}` : ""} · ${w}`;
    }
    if (mode === "opens_first") {
      const w = lang === "en" ? "opens at" : lang === "ar" ? "يفتح في" : "ouvre à";
      return `- **${r.name}**${loc ? ` — ${loc}` : ""} · ${w} ${fmt(r.opens)}`;
    }
    const w = lang === "en" ? "closes at" : lang === "ar" ? "يغلق في" : "ferme à";
    return `- **${r.name}**${loc ? ` — ${loc}` : ""} · ${w} ${fmt(r.closes)}`;

  });

  const intro = mode === "opens_first"
    ? (lang === "en" ? `Among the previous results, **${top[0].name}** opens the earliest today (${dayLabel}):`
      : lang === "ar" ? `من بين النتائج السابقة، **${top[0].name}** يفتح أبكر اليوم (${dayLabel}):`
      : `Parmi les précédents, c'est **${top[0].name}** qui ouvre le plus tôt aujourd'hui (${dayLabel}) :`)
    : (lang === "en" ? `Among the previous results, **${top[0].name}** closes the latest today (${dayLabel}):`
      : lang === "ar" ? `من بين النتائج السابقة، **${top[0].name}** يغلق متأخرًا اليوم (${dayLabel}):`
      : `Parmi les précédents, c'est **${top[0].name}** qui ferme le plus tard aujourd'hui (${dayLabel}) :`);

  const skipped = ids.length - rows.length;
  const outro = skipped > 0
    ? (lang === "en" ? `\n\n_(${skipped} result${skipped > 1 ? "s" : ""} excluded: hours not published or closed today.)_`
      : lang === "ar" ? `\n\n_(${skipped} نتيجة مستبعدة: الساعات غير منشورة أو مغلقة اليوم.)_`
      : `\n\n_(${skipped} résultat${skipped > 1 ? "s" : ""} exclu${skipped > 1 ? "s" : ""} : horaires non publiés ou fermé aujourd'hui.)_`)
    : "";

  return `${intro}\n\n${lines.join("\n")}${outro}`;
}

export type OpenFilterIntent = { kind: "now" | "slot"; startH?: number; endH?: number; label: string; dayOffset?: number };

export function parseOpenFilterIntent(text: string): OpenFilterIntent | null {
  const n = normalize(text);
  if (!n) return null;
  const filterHint = /\b(lesquels|lesquelles|quels|quelles|which|lequel|laquelle|filtre|filtrer|only|seulement|garde|ouverts?|open|مفتوح|أي(?:ها)?)\b/i.test(text);
  if (!filterHint) return null;
  if (/\b(demain\s+soir|tomorrow\s+(?:evening|night))\b/i.test(text)) return { kind: "slot", startH: 19, endH: 23, label: "tomorrow evening", dayOffset: 1 };
  if (/\b(demain\s+midi|tomorrow\s+(?:noon|lunch))\b/i.test(text)) return { kind: "slot", startH: 12, endH: 14, label: "tomorrow lunch", dayOffset: 1 };
  if (/\b(demain\s+matin|tomorrow\s+morning)\b/i.test(text)) return { kind: "slot", startH: 8, endH: 12, label: "tomorrow morning", dayOffset: 1 };
  if (/\b(demain|tomorrow|غدا)\b/i.test(text)) return { kind: "slot", startH: 10, endH: 22, label: "tomorrow", dayOffset: 1 };
  if (/\b(maintenant|actuellement|now|right now|الآن)\b/i.test(text)) return { kind: "now", label: "now" };
  if (/\b(ce soir|soiree|tonight|this evening|الليلة)\b/i.test(text)) return { kind: "slot", startH: 19, endH: 23, label: "evening", dayOffset: 0 };
  if (/\b(matin|morning|صباح)\b/i.test(text)) return { kind: "slot", startH: 8, endH: 12, label: "morning", dayOffset: 0 };
  if (/\b(midi|dejeuner|lunch|غداء)\b/i.test(text)) return { kind: "slot", startH: 12, endH: 14, label: "lunch", dayOffset: 0 };
  if (/\b(apres[- ]?midi|after ?noon|بعد الظهر)\b/i.test(text)) return { kind: "slot", startH: 14, endH: 18, label: "afternoon", dayOffset: 0 };
  if (/\b(diner|dinner|عشاء)\b/i.test(text)) return { kind: "slot", startH: 19, endH: 23, label: "dinner", dayOffset: 0 };
  if (/\b(nuit|night|nocturne|ليل)\b/i.test(text)) return { kind: "slot", startH: 22, endH: 26, label: "night", dayOffset: 0 };
  if (/\b(ouverts?|open|مفتوح)\b/i.test(text)) return { kind: "now", label: "now" };
  return null;
}

export async function buildOpenFilter(admin: any, ids: string[], intent: OpenFilterIntent, lang: "fr" | "en" | "ar"): Promise<string | null> {
  if (!ids.length) return null;
  const rows = await fetchPriorFull(admin, ids);
  if (!rows.length) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  const wdMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const todayIdx = wdMap[get("weekday")] ?? 0;
  const nowMin = parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10);
  const dayOffset = intent.kind === "now" ? 0 : (intent.dayOffset ?? 0);
  const dayIdx = (todayIdx + dayOffset) % 7;
  const dayKey = DAY_KEYS[dayIdx];

  const slotStart = intent.kind === "now" ? nowMin : (intent.startH ?? 0) * 60;
  const slotEnd = intent.kind === "now" ? nowMin + 1 : (intent.endH ?? 24) * 60;

  const toMin = (s: string): number | null => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ""); return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null; };
  const overlaps = (openStr?: string, closeStr?: string): boolean => {
    if (!openStr || !closeStr) return false;
    const o = toMin(openStr), c = toMin(closeStr); if (o == null || c == null) return false;
    const cAdj = c <= o ? c + 1440 : c;
    const sEnd = slotEnd <= slotStart ? slotEnd + 1440 : slotEnd;
    return slotStart < cAdj && sEnd > o;
  };

  const y = get("year"), mo = get("month"), da = get("day");
  const target = new Date(`${y}-${mo}-${da}T00:00:00Z`); target.setUTCDate(target.getUTCDate() + dayOffset);
  const targetStr = target.toISOString().slice(0, 10);

  const kept: any[] = [];
  for (const b of rows) {
    if (b.is_open_24h) { kept.push(b); continue; }
    if (b.show_opening_hours !== true) continue;
    if (Array.isArray(b.vacation_dates)) {
      const onVac = b.vacation_dates.some((v: any) => v?.start_date && v?.end_date && targetStr >= v.start_date && targetStr <= v.end_date);
      if (onVac) continue;
    }
    const d = b.opening_hours?.[dayKey];
    if (!d || d.closed) continue;
    if (overlaps(d.open, d.close) || (!d.continuous && overlaps(d.open2, d.close2))) kept.push(b);
  }

  const ordered = orderByIds(kept, ids);
  const labelMap: Record<string, Record<string, string>> = {
    now: { fr: "ouverts maintenant", en: "open now", ar: "مفتوحة الآن" },
    evening: { fr: "ouverts ce soir", en: "open this evening", ar: "مفتوحة هذا المساء" },
    dinner: { fr: "ouverts pour le dîner", en: "open for dinner", ar: "مفتوحة للعشاء" },
    morning: { fr: "ouverts ce matin", en: "open this morning", ar: "مفتوحة هذا الصباح" },
    lunch: { fr: "ouverts pour le déjeuner", en: "open for lunch", ar: "مفتوحة للغداء" },
    afternoon: { fr: "ouverts cet après-midi", en: "open this afternoon", ar: "مفتوحة بعد الظهر" },
    night: { fr: "ouverts en soirée tardive", en: "open late", ar: "مفتوحة ليلاً" },
    tomorrow: { fr: "ouverts demain", en: "open tomorrow", ar: "مفتوحة غدًا" },
    "tomorrow evening": { fr: "ouverts demain soir", en: "open tomorrow evening", ar: "مفتوحة غدًا مساءً" },
    "tomorrow lunch": { fr: "ouverts demain midi", en: "open tomorrow at lunch", ar: "مفتوحة غدًا للغداء" },
    "tomorrow morning": { fr: "ouverts demain matin", en: "open tomorrow morning", ar: "مفتوحة غدًا صباحًا" },
  };
  const label = labelMap[intent.label]?.[lang] || labelMap.now[lang];

  if (!ordered.length) {
    if (lang === "en") return `None of the previous results are **${label}** based on published hours.`;
    if (lang === "ar") return `لا توجد من النتائج السابقة **${label}** حسب الساعات المنشورة.`;
    return `Aucun des résultats précédents n'est **${label}** selon les horaires publiés.`;
  }

  const lines = ordered.slice(0, 10).map((r: any) => {
    const loc = [r.neighborhood, r.city].filter(Boolean).join(", ");
    return `- **${r.name}**${loc ? ` — ${loc}` : ""}`;
  });
  const skipped = ids.length - ordered.length;
  const intro = lang === "en" ? `Filtered to **${ordered.length}** result${ordered.length > 1 ? "s" : ""} ${label}:`
    : lang === "ar" ? `تم التصفية إلى **${ordered.length}** نتيجة ${label}:`
    : `Filtré : **${ordered.length}** résultat${ordered.length > 1 ? "s" : ""} ${label} :`;
  const outro = skipped > 0
    ? (lang === "en" ? `\n\n_(${skipped} excluded: hours not published or closed.)_`
      : lang === "ar" ? `\n\n_(${skipped} مستبعدة: الساعات غير منشورة أو مغلقة.)_`
      : `\n\n_(${skipped} exclu${skipped > 1 ? "s" : ""} : horaires non publiés ou fermé.)_`)
    : "";
  return `${intro}\n\n${lines.join("\n")}${outro}${toMapMarker(ordered)}`;
}
