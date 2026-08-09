// Extrait verbatim de supabase/functions/embed-ai-chat/index.ts (moteur A/B/C, étape 3).
// Aucune réécriture : le rendu est déjà validé en production.

export function buildEventsWeekendAnswer(
  events: any[],
  host: any,
  city: string,
  from: string,
  to: string,
  lang: "fr" | "en" | "ar",
): string {
  const hostName = host?.name || "";
  const fmtDate = (iso: string | null) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const locale = lang === "en" ? "en-GB" : lang === "ar" ? "ar-MA" : "fr-FR";
      return d.toLocaleDateString(locale, { day: "numeric", month: "long" });
    } catch { return ""; }
  };
  const fmtWhen = (e: any) => {
    if (e.recurrence) {
      const days = Array.isArray(e.days_of_week) ? e.days_of_week.join(", ") : "";
      return days || (lang === "en" ? "recurring" : lang === "ar" ? "متكرر" : "récurrent");
    }
    const a = fmtDate(e.start_date);
    const b = fmtDate(e.end_date);
    if (a && b && a !== b) return lang === "en" ? `${a} → ${b}` : lang === "ar" ? `${a} ← ${b}` : `du ${a} au ${b}`;
    return a || b;
  };

  if (!events?.length) {
    if (lang === "en") return `No events found in **${city}** between **${from}** and **${to}**. Want me to widen the window or try another city?`;
    if (lang === "ar") return `لا توجد فعاليات في **${city}** بين **${from}** و **${to}**. هل توسّع النطاق الزمني أو أجرّب مدينة أخرى؟`;
    return `Aucun événement trouvé à **${city}** entre **${from}** et **${to}**. Tu veux que j'élargisse la période ou que je regarde une autre ville ?`;
  }

  const intro = lang === "en"
    ? `From **${hostName}**, the ${city} scene this weekend offers a compact selection worth stepping out for — here is what stands out in the One World Morocco agenda.`
    : lang === "ar"
      ? `انطلاقًا من **${hostName}**، تقدّم أجواء ${city} هذا الأسبوع مجموعة مختارة من الفعاليات ضمن أجندة One World Morocco.`
      : `Depuis **${hostName}**, la scène de ${city} propose ce week-end une sélection resserrée qui vaut le déplacement — voici ce qui se détache dans l'agenda One World Morocco.`;

  const body = events.map((e: any) => {
    const when = fmtWhen(e);
    const where = [e.neighborhood, e.city].filter(Boolean).join(", ");
    const hook = String(e.hook || "").trim();
    const bits = [when, where].filter(Boolean).join(" · ");
    return `**${e.name}**${bits ? `. ${bits}` : ""}${hook ? `. ${hook}` : ""}`;
  }).join("\n\n");

  const closing = lang === "en"
    ? `\n\nWant me to filter by evening, family-friendly, or a specific neighborhood?`
    : lang === "ar"
      ? `\n\nهل أُصفّي حسب المساء، للعائلات، أو حسب حي محدّد؟`
      : `\n\nTu veux que je filtre par soirée, en famille, ou par quartier précis ?`;

  return `${intro}\n\n${body}${closing}`;
}
