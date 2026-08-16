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
  const DOW_LABELS: Record<string, { fr: string; en: string; ar: string }> = {
    monday: { fr: "lundi", en: "Monday", ar: "الاثنين" },
    tuesday: { fr: "mardi", en: "Tuesday", ar: "الثلاثاء" },
    wednesday: { fr: "mercredi", en: "Wednesday", ar: "الأربعاء" },
    thursday: { fr: "jeudi", en: "Thursday", ar: "الخميس" },
    friday: { fr: "vendredi", en: "Friday", ar: "الجمعة" },
    saturday: { fr: "samedi", en: "Saturday", ar: "السبت" },
    sunday: { fr: "dimanche", en: "Sunday", ar: "الأحد" },
  };
  const NUM_DOW = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dowLabel = (v: any): string => {
    const raw = typeof v === "number" ? NUM_DOW[v] : String(v || "").toLowerCase().trim();
    const hit = DOW_LABELS[raw];
    if (!hit) return String(v ?? "");
    return hit[lang] || hit.fr;
  };
  const fmtWhen = (e: any) => {
    if (e.recurrence) {
      const days = Array.isArray(e.days_of_week) ? e.days_of_week.map(dowLabel).filter(Boolean).join(", ") : "";
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

// ─────────────────────────────────────────────────────────────────────────────
// Récupération déterministe des événements #Agenda (port verbatim de la logique
// `search_events` de embed-ai-chat v1) — partagée par les 3 surfaces.
// ─────────────────────────────────────────────────────────────────────────────

const norm = (s: string) =>
  String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export function weekendWindow(): { from: string; to: string } {
  const today = new Date();
  const dow = today.getDay();
  const daysUntilSun = (7 - dow) % 7 || 7;
  return {
    from: today.toISOString().slice(0, 10),
    to: new Date(today.getTime() + daysUntilSun * 86400000).toISOString().slice(0, 10),
  };
}

export async function fetchAgendaEvents(
  admin: any,
  opts: { city?: string | null; from: string; to: string; limit?: number; badgeIds?: string[] | null },
): Promise<any[]> {
  const limit = Math.min(Number(opts.limit) || 10, 20);
  const { from, to } = opts;

  let eventIds: string[] | null = null;
  if (opts.badgeIds?.length) {
    const { data: eb } = await admin.from("event_badges").select("event_id").in("badge_id", opts.badgeIds);
    eventIds = (eb || []).map((r: any) => r.event_id).filter(Boolean);
    if (!eventIds.length) return [];
  } else {
    const { data: badge } = await admin.from("badges").select("id").ilike("name_fr", "%agenda%").limit(1).maybeSingle();
    if (badge?.id) {
      const { data: eb } = await admin.from("event_badges").select("event_id").eq("badge_id", badge.id);
      eventIds = (eb || []).map((r: any) => r.event_id).filter(Boolean);
      if (!eventIds.length) return [];
    }
  }

  let q = admin
    .from("events")
    .select("id,name,hook,description,start_date,end_date,recurrence,days_of_week,start_time,end_time,url,city_id,default_business_id,images,videos,sort_order,logo_url,cities:city_id(name_fr),neighborhoods:neighborhood_id(name)")
    .or(`and(start_date.gte.${from},start_date.lte.${to}),and(start_date.lte.${to},end_date.gte.${from}),recurrence.not.is.null,days_of_week.neq.{}`)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("start_date", { ascending: true, nullsFirst: false })
    .limit(limit * 5);
  if (eventIds) q = q.in("id", eventIds.slice(0, 500));
  const { data } = await q;
  let results: any[] = data || [];

  if (opts.city) {
    const cv = norm(opts.city);
    results = results.filter((e: any) => norm(e.cities?.name_fr || "").includes(cv));
  }

  // Une récurrence doit RÉELLEMENT croiser [from, to].
  const fromDate = new Date(from + "T00:00:00Z");
  const toDate = new Date(to + "T23:59:59Z");
  const DOW: Record<string, number> = {
    sunday: 0, sun: 0, dimanche: 0, monday: 1, mon: 1, lundi: 1, tuesday: 2, tue: 2, mardi: 2,
    wednesday: 3, wed: 3, mercredi: 3, thursday: 4, thu: 4, jeudi: 4, friday: 5, fri: 5, vendredi: 5,
    saturday: 6, sat: 6, samedi: 6,
  };
  const dows = (arr: any): number[] =>
    (Array.isArray(arr) ? arr : [])
      .map((v: any) => (typeof v === "number" ? v : DOW[String(v).toLowerCase()]))
      .filter((n: any) => Number.isInteger(n));
  const intersects = (e: any): boolean => {
    const sd = e.start_date ? new Date(e.start_date + "T00:00:00Z") : null;
    const ed = e.end_date ? new Date(e.end_date + "T23:59:59Z") : sd;
    const dw = dows(e.days_of_week);
    const rec = e.recurrence ? String(e.recurrence).toLowerCase() : (dw.length ? "weekly" : "");
    if (!rec) return sd ? sd <= toDate && (ed ?? sd) >= fromDate : false;
    if (rec === "daily") return true;
    if (rec === "weekly") {
      if (!dw.length) return true;
      for (let t = fromDate.getTime(); t <= toDate.getTime(); t += 86400000) {
        if (dw.includes(new Date(t).getUTCDay())) return true;
      }
      return false;
    }
    if (rec === "monthly" && sd) {
      const dom = sd.getUTCDate();
      for (let t = fromDate.getTime(); t <= toDate.getTime(); t += 86400000) {
        if (new Date(t).getUTCDate() === dom) return true;
      }
      return false;
    }
    if (rec === "yearly" && sd) {
      const m = sd.getUTCMonth(), d = sd.getUTCDate();
      for (let t = fromDate.getTime(); t <= toDate.getTime(); t += 86400000) {
        const dt = new Date(t);
        if (dt.getUTCMonth() === m && dt.getUTCDate() === d) return true;
      }
      return false;
    }
    return sd ? sd <= toDate && (ed ?? sd) >= fromDate : false;
  };
  results = results.filter(intersects).slice(0, limit);
  if (!results.length) return [];

  // Vignette : image 1 de l'événement, sinon thumbnail de la vidéo 1.
  const firstVideoUrls = results
    .map((e: any) => (Array.isArray(e.videos) ? e.videos.filter(Boolean)[0] : null))
    .filter(Boolean) as string[];
  const thumbByUrl = new Map<string, string>();
  if (firstVideoUrls.length) {
    const { data: docs } = await admin
      .from("business_documents")
      .select("url,thumbnail_url")
      .eq("business_is_active", true)
      .in("url", firstVideoUrls);
    for (const d of docs || []) {
      if ((d as any).url && (d as any).thumbnail_url) thumbByUrl.set((d as any).url, (d as any).thumbnail_url);
    }
  }

  // Établissement lié : default_business_id puis event_businesses.
  const linked = new Map<string, string>();
  for (const e of results) if (e.default_business_id) linked.set(e.id, e.default_business_id);
  const missing = results.map((e: any) => e.id).filter((id: string) => !linked.has(id));
  if (missing.length) {
    const { data: ebRows } = await admin.from("event_businesses").select("event_id,business_id").in("event_id", missing);
    for (const r of ebRows || []) {
      const eid = (r as any).event_id, bid = (r as any).business_id;
      if (eid && bid && !linked.has(eid)) linked.set(eid, bid);
    }
  }
  const bizById = new Map<string, any>();
  const bizIds = Array.from(new Set(Array.from(linked.values())));
  if (bizIds.length) {
    const { data: bizRows } = await admin
      .from("businesses")
      .select("id,name,slug,latitude,longitude,city,neighborhood,address,logo_url,images")
      .in("id", bizIds);
    for (const b of bizRows || []) if ((b as any).id) bizById.set((b as any).id, b);
  }

  const mapped = results.map((e: any) => {
    const bizId = linked.get(e.id) || null;
    const biz = bizId ? bizById.get(bizId) : null;
    const firstImage = Array.isArray(e.images) ? e.images.filter(Boolean)[0] : null;
    const firstVideo = Array.isArray(e.videos) ? e.videos.filter(Boolean)[0] : null;
    return {
      id: e.id, name: e.name, hook: e.hook,
      start_date: e.start_date, end_date: e.end_date,
      recurrence: e.recurrence, days_of_week: e.days_of_week,
      start_time: e.start_time, end_time: e.end_time,
      city: e.cities?.name_fr || biz?.city || null,
      neighborhood: e.neighborhoods?.name || biz?.neighborhood || null,
      address: biz?.address || null,
      url: e.url || null,
      sort_order: e.sort_order ?? null,
      default_business_id: bizId,
      business_name: bizId ? (biz?.name || null) : null,
      business_slug: biz?.slug ?? null,
      latitude: biz?.latitude ?? null,
      longitude: biz?.longitude ?? null,
      image: firstImage || (firstVideo ? thumbByUrl.get(firstVideo) || null : null),
      video: firstVideo || null,
    };
  });

  return mapped;
}

/** Réponse d'une relance filtrée (quartier, etc.) sur un agenda déjà affiché. */
export function buildEventsFilteredAnswer(
  events: any[],
  label: string,
  city: string,
  lang: "fr" | "en" | "ar",
): string {
  if (!events.length) {
    if (lang === "en") return `No event from this agenda is located in **${label}** (${city}). Want me to widen to all of ${city}?`;
    if (lang === "ar") return `لا توجد فعالية من هذه الأجندة في **${label}** (${city}). هل أوسّع إلى كل ${city}؟`;
    return `Aucun événement de cet agenda n'a lieu à **${label}** (${city}). Tu veux que j'élargisse à tout ${city} ?`;
  }
  const head = lang === "en"
    ? `Here is what the agenda keeps in **${label}** — ${events.length} event${events.length > 1 ? "s" : ""}.`
    : lang === "ar"
      ? `هذا ما تبقّى من الأجندة في **${label}** — ${events.length} فعالية.`
      : `Voilà ce que l'agenda retient à **${label}** — ${events.length} événement${events.length > 1 ? "s" : ""}.`;
  const body = events.map((e: any) => {
    const where = [e.neighborhood, e.city].filter(Boolean).join(", ");
    const hook = String(e.hook || "").trim();
    return `**${e.name}**${where ? `. ${where}` : ""}${hook ? `. ${hook}` : ""}`;
  }).join("\n\n");
  return `${head}\n\n${body}`;
}

/** Dernier agenda affiché dans l'historique (marqueur EVENTS_SNAPSHOT). */
export function priorEventsSnapshot(
  uiMessages: any[],
): { title: string | null; city: string | null; events: any[] } | null {
  for (let i = uiMessages.length - 1; i >= 0; i--) {
    const m = uiMessages[i];
    if (m?.role !== "assistant") continue;
    const text = (Array.isArray(m.parts) ? m.parts : [])
      .filter((p: any) => p?.type === "text")
      .map((p: any) => String(p.text || ""))
      .join("");
    const matches = [...text.matchAll(/<!--EVENTS_SNAPSHOT:([\s\S]*?)-->/g)];
    if (!matches.length) continue;
    try {
      const parsed = JSON.parse(matches[matches.length - 1][1].replace(/--&gt;/g, "-->"));
      if (Array.isArray(parsed?.events) && parsed.events.length) {
        return { title: parsed.title ?? null, city: parsed.city ?? null, events: parsed.events };
      }
    } catch { /* marqueur illisible : ignoré */ }
  }
  return null;
}

/** Marqueur consommé par les fronts (/embed, /club, /search). */
export function eventsSnapshotMarker(events: any[], city: string | null, title: string | null = null): string {
  const safe = JSON.stringify({ title, city, events }).replace(/-->/g, "--&gt;");
  return `<!--EVENTS_SNAPSHOT:${safe}-->`;
}
