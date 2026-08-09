// Helper d'ingestion d'events business (table interne business_events).
// File d'attente batch + flush sur idle ou pagehide, dedupe des "view" courts.
import { supabase } from "@/integrations/supabase/client";

type BusinessEventType =
  | "view"
  | "impression"
  | "whatsapp_click"
  | "phone_click"
  | "email_click"
  | "directions_click"
  | "affiliate_click"
  | "bookmark_add"
  | "bookmark_remove"
  | "share_open"
  | "share_complete"
  | "booking_intent"
  | "video_play"
  | "document_open"
  | "outbound_click";

/** Surfaces d'apparition (impressions) : liste de résultats, carte, carrousel, widget. */
export type ImpressionSurface = "list" | "map" | "carousel" | "widget" | "blog";

interface QueuedEvent {
  business_id: string;
  event_type: BusinessEventType;
  event_subtype?: string | null;
  session_id?: string | null;
  source_page?: string | null;
  referrer_domain?: string | null;
  meta?: Record<string, unknown> | null;
}

const SESSION_KEY = "bz-session-id-v1";
const VIEW_DEDUPE_KEY = "bz-view-dedupe-v1";
const VIEW_DEDUPE_TTL = 30 * 60 * 1000; // 30 min

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

function shouldDedupeView(businessId: string): boolean {
  try {
    const raw = sessionStorage.getItem(VIEW_DEDUPE_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    // purge expired
    for (const k of Object.keys(map)) if (now - map[k] > VIEW_DEDUPE_TTL) delete map[k];
    if (map[businessId] && now - map[businessId] < VIEW_DEDUPE_TTL) return true;
    map[businessId] = now;
    sessionStorage.setItem(VIEW_DEDUPE_KEY, JSON.stringify(map));
  } catch { /* noop */ }
  return false;
}

function refDomain(): string | null {
  try {
    if (!document.referrer) return null;
    const u = new URL(document.referrer);
    if (u.host === window.location.host) return null;
    return u.host;
  } catch { return null; }
}

const queue: QueuedEvent[] = [];
let flushTimer: number | null = null;
const FLUSH_DELAY = 2000;
const MAX_BATCH = 20;

async function flush() {
  if (flushTimer !== null) { window.clearTimeout(flushTimer); flushTimer = null; }
  if (queue.length === 0) return;
  const batch = queue.splice(0, MAX_BATCH);
  try {
    await supabase.functions.invoke("log-business-event", { body: { events: batch } });
  } catch {
    // silent — analytics never breaks UX
  }
  if (queue.length > 0) scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(() => { void flush(); }, FLUSH_DELAY);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(id: string): boolean {
  return UUID_RE.test(id);
}

/** Track an event tied to a specific business. Non-blocking, batched. */
export function trackBusinessEvent(
  businessId: string | null | undefined,
  type: BusinessEventType,
  opts: { subtype?: string; meta?: Record<string, unknown> } = {},
) {
  if (!businessId || !isValidUuid(businessId)) return;
  if (type === "view" && shouldDedupeView(businessId)) return;
  queue.push({
    business_id: businessId,
    event_type: type,
    event_subtype: opts.subtype ?? null,
    session_id: getSessionId(),
    source_page: window.location.pathname + window.location.search,
    referrer_domain: refDomain(),
    meta: opts.meta ?? null,
  });
  if (queue.length >= MAX_BATCH) void flush();
  else scheduleFlush();
}

// Flush on pagehide/beforeunload pour ne pas perdre la file.
if (typeof window !== "undefined") {
  const flushSync = () => { void flush(); };
  window.addEventListener("pagehide", flushSync);
  window.addEventListener("beforeunload", flushSync);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSync();
  });
}

/* ------------------------------------------------------------------ */
/* Impressions (apparitions en liste / carte / carrousel)              */
/* ------------------------------------------------------------------ */

const IMP_DEDUPE_KEY = "bz-imp-dedupe-v1";
const IMP_DEDUPE_TTL = 30 * 60 * 1000; // 30 min, par établissement ET par surface

function shouldDedupeImpression(businessId: string, surface: ImpressionSurface): boolean {
  const key = `${businessId}|${surface}`;
  try {
    const raw = sessionStorage.getItem(IMP_DEDUPE_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    for (const k of Object.keys(map)) if (now - map[k] > IMP_DEDUPE_TTL) delete map[k];
    if (map[key] && now - map[key] < IMP_DEDUPE_TTL) return true;
    map[key] = now;
    sessionStorage.setItem(IMP_DEDUPE_KEY, JSON.stringify(map));
  } catch { /* noop */ }
  return false;
}

/** Une apparition d'établissement (carte de liste, marqueur de carte, carrousel). */
export function trackBusinessImpression(
  businessId: string | null | undefined,
  surface: ImpressionSurface = "list",
  meta?: Record<string, unknown>,
) {
  if (!businessId || !isValidUuid(businessId)) return;
  if (shouldDedupeImpression(businessId, surface)) return;
  queue.push({
    business_id: businessId,
    event_type: "impression",
    event_subtype: surface,
    session_id: getSessionId(),
    source_page: window.location.pathname + window.location.search,
    referrer_domain: refDomain(),
    meta: meta ?? null,
  });
  scheduleFlush();
}

/** Version groupée (ex. tous les marqueurs affichés sur une carte). */
export function trackBusinessImpressions(
  businessIds: Array<string | null | undefined>,
  surface: ImpressionSurface = "list",
) {
  const seen = new Set<string>();
  for (const id of businessIds) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    trackBusinessImpression(id, surface);
  }
}
