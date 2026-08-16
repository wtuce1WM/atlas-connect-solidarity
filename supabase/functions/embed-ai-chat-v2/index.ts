// Moteur IA v2 — surface "embed" réécrite from scratch au-dessus du moteur A/B/C partagé.
// Objectif : lisibilité et coût maîtrisé. Aucune dépendance à embed-ai-chat (v1) : les deux
// fonctions coexistent, la surface loguée est "embed_v2" pour permettre la comparaison.
//
// Contrat d'entrée/sortie IDENTIQUE à embed-ai-chat :
//   body: { messages: UIMessage[], businessSlug, language, sessionId, messageIndex,
//           suggestionId, followupId, scope }
//   sortie: UIMessageStream (AI SDK v5) + marqueurs texte (SHOW_ON_MAP, KNOWN_BUSINESSES,
//           WEATHER_FORECAST) consommés par EmbedAsk.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "npm:ai@5";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";
import { AI_MODEL, getSurfaceConfig } from "../_shared/ai-engine/surfaces.ts";
import { classify } from "../_shared/ai-engine/classify.ts";
import {
  resolveWithAdmin,
  resolutionMetric,
  strongTargetsOfType,
  targetsOfType,
  qualifiedServiceTargets,
  type ResolveResult,
} from "../_shared/taxonomy-resolver.ts";

import { detectViewIntent, withinPointRadius, hasVantage, hasPointViewProof, hasPanoramaAttribute, hasPanoramaProof } from "../_shared/ai-engine/view-targets.ts";
import { pickLang, normalize, toMapMarker, fetchPriorFull, matchBusinessNameInMessage } from "../_shared/ai-engine/routes/shared.ts";
import { loadEditorialBundle, formatEditorialBundle } from "../_shared/ai-engine/editorial.ts";
import { isWeatherIntent } from "../_shared/ai-engine/routes/weather.ts";
import { isTidesIntent, resolveTidesCity, tidesIntro } from "../_shared/ai-engine/routes/tides.ts";
import {
  loadCuratedTargets, fetchBlogPostsCached, matchBlogArticle, matchCuratedByText,
  buildArticleTeaser, buildPinnedAnswer, buildFilteredAnswer, applyLabelPlaceholders,

} from "../_shared/ai-engine/routes/curated.ts";
import { buildVideoFeedAnswer, videoFeedMarker } from "../_shared/ai-engine/routes/videoFeed.ts";
import { buildEventsWeekendAnswer, buildEventsFilteredAnswer, fetchAgendaEvents, weekendWindow, eventsSnapshotMarker, priorEventsSnapshot } from "../_shared/ai-engine/routes/events.ts";
import { isHoursIntent, buildHoursAnswer, buildHoursForBusinesses } from "../_shared/ai-engine/routes/opening.ts";
import { isBookingIntent, buildBookingAnswer, buildBookingForBusinesses } from "../_shared/ai-engine/routes/booking.ts";
import {
  isNearbyOverviewIntent, isProximityIntent, buildNearbyOverview, buildDisclosureFromCounts,
  parseInlineRadiusKm,
} from "../_shared/ai-engine/routes/nearby.ts";
import {
  isRatingRankingIntent, isDistanceListIntent, isDistanceRankingIntent, isCountIntent, parseOrdinalIntent,
  extractPriorOrderedBusinesses, buildRatingRanking, buildDistanceList, buildDistanceRanking, buildOrdinalPick,
  buildCountAnswer, buildProximityFromPool, isShowMoreIntent,
} from "../_shared/ai-engine/routes/ranking.ts";

import { isOpensFirstIntent, isClosesLastIntent, buildHoursRanking, parseOpenFilterIntent, buildOpenFilter } from "../_shared/ai-engine/routes/opening.ts";
import { isDescribeIntent, parseDescribeFacet, buildDescribePriors } from "../_shared/ai-engine/routes/describe.ts";
import { isForcedRouteKey, runForcedRoute, forcedMapMarker } from "../_shared/ai-engine/routes/forced.ts";
import { resolveCityScope, detectExplicitCity } from "../_shared/ai-engine/city-scope.ts";
import {
  resolveNeighborhoodInMessage, filterPoolByNeighborhood, neighborhoodEmptyMessage,
} from "../_shared/ai-engine/neighborhood-filter.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Surfaces servies par ce moteur. La surface arrive dans le body (défaut: embed). */
type EngineSurface = "embed" | "search" | "club";
const SURFACE_LOG_BY_SURFACE: Record<EngineSurface, string> = {
  embed: "embed_v2",
  search: "search_v2",
  club: "club_v2",
};

type AiClass = "A" | "B" | "C";
type Lang = "fr" | "en" | "ar";

const HOST_FIELDS =
  "id, slug, name, city, neighborhood, address, main_category, categories, hook_fr, hook_en, hook_ar, " +
  "description, description_en, description_ar, min_price, manual_price_range, phone, whatsapp, website, " +
  "opening_hours, show_opening_hours, reserve_now_url, reserve_now_cta, presentation_mode, online_shop_url, " +
  "online_shop_cta, online_shop_presentation_mode, url_4, url_4_cta, url_4_presentation_mode, url_5, " +
  "url_5_cta, url_5_presentation_mode, latitude, longitude, is_active, poi_radius_km";

const CARD_FIELDS =
  "id, name, slug, city, neighborhood, main_category, hook_fr, hook_en, hook_ar, latitude, longitude, " +
  "min_price, manual_price_range, logo_url, images, google_rating, google_review_count, " +
  "tripadvisor_rating, tripadvisor_review_count, computed_rating, total_review_count";

function textOf(m: UIMessage): string {
  const parts = (m as any)?.parts;
  if (Array.isArray(parts)) {
    return parts.filter((p: any) => p?.type === "text" && typeof p.text === "string").map((p: any) => p.text).join("");
  }
  return String((m as any)?.content ?? "");
}

/** Ids d'établissements déjà présentés dans le fil (marqueurs des tours précédents). */
function priorBusinessIds(messages: UIMessage[]): string[] {
  const ids: string[] = [];
  for (const m of messages) {
    if ((m as any)?.role !== "assistant") continue;
    const c = textOf(m);
    const known = c.match(/<!--KNOWN_BUSINESSES:(\[[\s\S]*?\])-->/);
    const map = c.match(/<!--SHOW_ON_MAP:([\s\S]*?)-->/);
    const raw = known?.[1] || map?.[1];
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.businesses) ? parsed.businesses : [];
      for (const b of arr) {
        const id = typeof b === "string" ? b : b?.id;
        if (id && !ids.includes(id)) ids.push(id);
      }
    } catch { /* marqueur illisible : ignoré */ }
  }
  return ids;
}

/**
 * Corpus COMPLET du tour précédent (marqueur `POOL_BUSINESS_IDS`) : les relances
 * de type proximité doivent chercher dans la totalité des résultats trouvés
 * (ex. 19 adresses à Marrakech) et pas seulement dans les 6 affichées.
 */
function priorPoolIds(messages: UIMessage[]): string[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i] as any;
    if (m?.role !== "assistant") continue;
    const match = textOf(m).match(/<!--POOL_BUSINESS_IDS:([\s\S]*?)-->/);
    if (!match) continue;
    try {
      const parsed = JSON.parse(match[1].replace(/--&gt;/g, "-->"));
      const ids = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.ids) ? parsed.ids : [];
      if (ids.length) return ids.map((x: any) => String(x));
    } catch { /* marqueur illisible : ignoré */ }
  }
  return [];
}

/**
 * Marqueur `POOL_BUSINESS_IDS` — source de vérité UNIQUE du corpus complet du
 * tour. Il embarque aussi `nb` (comptes par quartier calculés sur la TOTALITÉ
 * du pool, pas sur les fiches affichées) : les badges de quartier du footer
 * doivent annoncer 18 et non 6.
 */
async function poolMarker(admin: any, ids: string[], city: string | null): Promise<string> {
  const uniq = [...new Set(ids.map((x) => String(x)))];
  let nb: Record<string, number> = {};
  if (uniq.length) {
    const { data } = await admin.from("businesses").select("id, neighborhood").in("id", uniq);
    for (const row of (Array.isArray(data) ? data : []) as any[]) {
      const name = String(row?.neighborhood || "").trim();
      if (!name) continue;
      nb[name] = (nb[name] ?? 0) + 1;
    }
  }
  return `<!--POOL_BUSINESS_IDS:${JSON.stringify({ ids: uniq, city, nb })}-->`;
}



function hostContext(host: any, lang: Lang): string {
  const hook = lang === "en" ? host.hook_en : lang === "ar" ? host.hook_ar : host.hook_fr;
  const desc = lang === "en" ? host.description_en : lang === "ar" ? host.description_ar : host.description;
  return [
    `Établissement hôte: ${host.name} (${host.main_category || "-"}) — ${host.neighborhood || ""} ${host.city || ""}`.trim(),
    hook ? `Accroche: ${hook}` : "",
    desc ? `Description: ${String(desc).slice(0, 1200)}` : "",
    host.phone ? `Téléphone: ${host.phone}` : "",
    host.whatsapp ? `WhatsApp: ${host.whatsapp}` : "",
    host.min_price ? `Prix indicatif: ${host.min_price}` : host.manual_price_range ? `Prix: ${host.manual_price_range}` : "",
  ].filter(Boolean).join("\n");
}

function resultsContext(list: any[], lang: Lang): string {
  return list.map((b, i) => {
    const hook = lang === "en" ? b.hook_en : lang === "ar" ? b.hook_ar : b.hook_fr;
    const rating = b.computed_rating || b.google_rating || b.tripadvisor_rating;
    return `${i + 1}. ${b.name} — ${b.main_category || ""} ${b.neighborhood || b.city || ""}${rating ? ` — note ${rating}` : ""}${hook ? ` — ${String(hook).slice(0, 160)}` : ""}`;
  }).join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const admin = createClient(SUPABASE_URL, SERVICE);

  const body = await req.json().catch(() => ({} as any));
  const uiMessages: UIMessage[] = Array.isArray(body.messages) ? body.messages.slice(-8) : [];
  const slugOrId = String(body.businessSlug || body.businessId || "").trim();
  const surface: EngineSurface = ["embed", "search", "club"].includes(String(body.surface))
    ? (String(body.surface) as EngineSurface)
    : "embed";
  const CFG = getSurfaceConfig(surface);
  const SURFACE_LOG = SURFACE_LOG_BY_SURFACE[surface];
  /** Ville active de la surface sans hôte (/search, /club). */
  const activeCity: string | null = typeof body.activeCity === "string" && body.activeCity.trim()
    ? body.activeCity.trim()
    : null;
  const lang = pickLang(body.language) as Lang;
  const sessionId: string | null = typeof body.sessionId === "string" ? body.sessionId : null;
  let suggestionId: string | null = typeof body.suggestionId === "string" && body.suggestionId ? body.suggestionId : null;
  /** true quand la suggestion a été retrouvée depuis le texte libre (pas un clic). */
  let suggestionFromText = false;
  const followupId: string | null = typeof body.followupId === "string" && body.followupId ? body.followupId : null;
  /** Rayon de proximité demandé par l'utilisateur, borné aux valeurs du champ « Rayon de proximité ». */
  const RADIUS_OPTIONS = [0.5, 1, 5, 10, 20, 50, 100];
  const requestedRadiusKm: number | null = RADIUS_OPTIONS.includes(Number(body.radiusKm))
    ? Number(body.radiusKm)
    : null;
  /**
   * Filtre local imposé par un badge du footer (zéro token) : même catalogue de
   * routes que `route_override` du back-office, plus la clé locale
   * `neighborhood_filter` (filtre le corpus du tour précédent sur un quartier).
   */
  const clientForcedRoute: string | null = typeof body.forcedRoute === "string" && body.forcedRoute
    ? body.forcedRoute.trim()
    : null;

  // Seule la surface embed exige un établissement hôte : /search et /club
  // travaillent sur une ville active, sans fiche d'ancrage.
  if (!slugOrId && surface === "embed") {
    return new Response(JSON.stringify({ error: "businessSlug required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!uiMessages.length) {
    return new Response(JSON.stringify({ error: "messages required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userMessage = textOf([...uiMessages].reverse().find((m: any) => m?.role === "user") as UIMessage) || "";
  const priorIds = priorBusinessIds(uiMessages);
  /** Corpus complet du tour précédent (19 trouvées) — surensemble de `priorIds`. */
  const poolIds = [...new Set([...priorPoolIds(uiMessages), ...priorIds])];

  const chatId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(sessionId || ""))
    ? sessionId
    : null;


  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const t0 = Date.now();
      let firstTokenAt: number | null = null;
      const textId = crypto.randomUUID();
      let started = false;
      const start = () => { if (!started) { writer.write({ type: "text-start", id: textId }); started = true; } };
      const emit = (d: string) => {
        if (!d) return;
        if (!firstTokenAt) firstTokenAt = Date.now();
        start();
        writer.write({ type: "text-delta", id: textId, delta: d });
      };
      const end = () => { if (started) { writer.write({ type: "text-end", id: textId }); started = false; } };
      start(); // frame immédiate : évite une coupure côté iframe

      let aiClass: AiClass = "A";
      let route = "smalltalk";
      let confidence: number | null = null;
      let fallbackReason: string | null = null;
      let tokensIn = 0;
      let tokensOut = 0;
      let resultsCount: number | null = null;
      let hadError = false;
      let cityDetected: string | null = null;
      // Continuité de tour : catégorie retenue par le classifieur, réinjectée au tour suivant.
      let lastCategory: string | null = null;
      // Résolveur taxonomique = autorité du vocabulaire. Il ne décide pas du filtrage,
      // il tranche « ce terme existe-t-il vraiment en base, et sous quel type ».
      let resolutionLog: Record<string, unknown> = {};
      let resolution: ResolveResult | null = null;
      let resolutionAuthority: string | null = null;
      // Article pertinent détecté (curaté ou texte libre) : proposé en fin de
      // réponse sous forme de carte cliquable, jamais en remplacement des résultats.
      let articleTeaser: string | null = null;

      try {
        resolution = await resolveWithAdmin(admin, userMessage);
        resolutionLog = resolutionMetric(resolution);
      } catch (e) {
        console.warn("[embed-ai-chat-v2] resolver failed", String(e));
      }





      const finish = async (streamCompleted: boolean) => {
        if (articleTeaser) { emit(articleTeaser); articleTeaser = null; }
        end();

        try {
          const { error: logErr } = await admin.from("ai_conversation_turns").insert({
            chat_id: chatId,
            user_message: userMessage.slice(0, 2000),
            intent_classified: route,
            route_taken: route,
            ai_class: aiClass,
            classifier_confidence: confidence,
            fallback_reason: fallbackReason,
            surface: SURFACE_LOG,
            model: aiClass === "A" ? null : AI_MODEL,
            tokens_in: tokensIn,
            tokens_out: tokensOut,
            latency_ms_total: Date.now() - t0,
            latency_ms_first_token: firstTokenAt ? firstTokenAt - t0 : null,
            results_count: resultsCount,
            had_error: hadError,
            stream_completed: streamCompleted,
            city_active: null,
            city_detected: cityDetected,
            language: lang,
            tools_called: { session_id: sessionId, category: lastCategory, resolution_authority: resolutionAuthority },
            ...resolutionLog,
          });
          if (logErr) console.error("[embed-ai-chat-v2] log_failed", logErr.message);
        } catch (e) {
          console.error("[embed-ai-chat-v2] log_failed", e);
        }
      };


      try {
        // ── Hôte (optionnel hors surface embed) ─────────────────────────────
        let host: any = null;
        if (slugOrId) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
          let hq = admin.from("businesses").select(HOST_FIELDS).eq("is_active", true).limit(1);
          hq = isUuid ? hq.eq("id", slugOrId) : hq.eq("slug", slugOrId);
          const { data: hostRows } = await hq;
          if (!hostRows?.length) {
            emit("Établissement introuvable.");
            route = "out_of_scope";
            await finish(true);
            return;
          }
          host = hostRows[0];
        }
        // Périmètre géographique — RÈGLE UNIQUE (`_shared/ai-engine/city-scope.ts`) :
        // ville du business master, sauf ville explicitement nommée dans le message.
        const explicitCity = await detectExplicitCity(admin, userMessage);
        const scopeCity = resolveCityScope({ hostCity: host?.city, activeCity, explicitCity }) as string;
        cityDetected = scopeCity;

        // ── FILTRES LOCAUX (badges du footer) — zéro token, zéro modèle ──────
        // Le client impose une route du catalogue partagé sur le corpus déjà
        // affiché (`runForcedRoute`, même mécanisme que `route_override`), plus
        // la clé locale `neighborhood_filter`. Aucun repli silencieux : si la
        // route ne produit rien, on le dit et on s'arrête.
        if (clientForcedRoute && priorIds.length) {
          if (clientForcedRoute === "neighborhood_filter") {
            // Le badge envoie le libellé de quartier lu DANS le corpus courant :
            // on filtre donc sur ce libellé (égalité normalisée), et on n'utilise
            // le résolveur d'alias que comme complément. Jamais de repli sur une
            // recherche générique : la route répond ou dit qu'elle est vide.
            const nb = await resolveNeighborhoodInMessage(admin, userMessage, scopeCity).catch(() => null);
            const pool = await fetchPriorFull(admin, priorIds).catch(() => []);
            const wanted = normalize(userMessage);
            const kept = nb
              ? filterPoolByNeighborhood(pool as any[], nb)
              : (pool as any[]).filter((b) => normalize(String(b?.neighborhood || "")) === wanted);
            const label = nb?.name || userMessage.trim();
            route = "discover";
            resultsCount = kept.length;
            console.log("[embed-ai-chat-v2] local_neighborhood_filter", JSON.stringify({
              label, resolved: !!nb, kept: kept.length, from: (pool as any[]).length,
            }));
            if (!kept.length) {
              emit(nb
                ? neighborhoodEmptyMessage(nb, lang as any)
                : (lang === "en"
                  ? `No address from this selection is located in ${label}.`
                  : lang === "ar"
                    ? `لا يوجد أي عنوان من هذه القائمة في ${label}.`
                    : `Aucune adresse de cette sélection ne se trouve à ${label}.`));
              await finish(true);
              return;
            }
            const heading = lang === "en"
              ? `In **${label}** — ${kept.length} address${kept.length > 1 ? "es" : ""} from this selection:`
              : lang === "ar"
                ? `في **${label}** — ${kept.length} من هذه القائمة:`
                : `À **${label}** — ${kept.length} adresse${kept.length > 1 ? "s" : ""} de cette sélection :`;
            const built = await buildPinnedAnswer(
              admin, kept.map((b: any) => String(b.id)), host, lang, null,
              { route: "neighborhood_filter", heading, outro: "" },
            ).catch(() => null);
            if (built) {
              emit(built.text);
              if (built.mapPayload?.businesses?.length) {
                emit(`\n\n<!--SHOW_ON_MAP:${JSON.stringify(built.mapPayload)}-->`);
              }
              emit(`\n\n<!--KNOWN_BUSINESSES:${JSON.stringify(built.knownBusinesses)}-->`);
              await finish(true);
              return;
            }
          } else if (isForcedRouteKey(clientForcedRoute)) {
            const hostRadius = RADIUS_OPTIONS.includes(Number(host?.poi_radius_km)) ? Number(host.poi_radius_km) : 1;
            const forced = await runForcedRoute({
              admin, key: clientForcedRoute, lang, host, priorIds, userMessage,
              scopeCity, radiusKm: requestedRadiusKm ?? hostRadius,
            }).catch((e) => {
              console.error("[embed-ai-chat-v2] client_forced_route_failed", clientForcedRoute, String(e));
              return null;
            });
            console.log("[embed-ai-chat-v2] client_forced_route", JSON.stringify({
              key: clientForcedRoute, applied: !!forced,
            }));
            if (forced) {
              route = forced.route;
              resultsCount = forced.resultsCount;
              emit(forced.text);
              if (forced.mapBusinesses?.length) emit(`\n\n${forcedMapMarker(forced.mapBusinesses)}`);
              if (forced.knownBusinesses?.length) {
                emit(`\n\n<!--KNOWN_BUSINESSES:${JSON.stringify(forced.knownBusinesses)}-->`);
              }
              await finish(true);
              return;
            }
          }
        }



        // ── Relance contextuelle sur un agenda déjà affiché (route events) ──
        // Le tour précédent a renvoyé un EVENTS_SNAPSHOT : une relance courte
        // nommant un quartier filtre CE corpus d'événements, jamais une nouvelle
        // recherche d'établissements.
        {
          const priorEvents = priorEventsSnapshot(uiMessages as any[]);
          if (priorEvents && userMessage.trim().length <= 60) {
            const nb = await resolveNeighborhoodInMessage(
              admin, userMessage, priorEvents.city || scopeCity,
            ).catch(() => null);
            if (nb) {
              const filtered = filterPoolByNeighborhood(priorEvents.events as any[], nb);
              console.log("[embed-ai-chat-v2] events_followup_neighborhood", JSON.stringify({
                neighborhood: nb.name, city: nb.city, kept: filtered.length, from: priorEvents.events.length,
              }));
              route = "events";
              resultsCount = filtered.length;
              emit(buildEventsFilteredAnswer(filtered, nb.name, nb.city, lang as any));
              if (filtered.length) {
                emit(`\n\n${eventsSnapshotMarker(filtered, priorEvents.city || nb.city, nb.name)}`);
              }
              await finish(true);
              return;
            }
          }
        }



        // ── Relance « je te montre les autres » (zéro token, zéro recherche) ──
        // Elle ne doit RIEN faire d'autre qu'afficher le lot suivant du corpus
        // déjà trouvé au tour précédent (10 max par lot, cartes identiques).
        if (poolIds.length && isShowMoreIntent(userMessage)) {
          const already = new Set(priorIds);
          const remaining = poolIds.filter((id) => !already.has(id));
          if (remaining.length) {
            const batch = remaining.slice(0, 10);
            const shownBefore = poolIds.length - remaining.length;
            const restAfter = remaining.length - batch.length;
            const heading = lang === "en"
              ? `Next ones — ${batch.length} more address${batch.length > 1 ? "es" : ""}:`
              : lang === "ar"
                ? `التالية — ${batch.length} عنوانًا إضافيًا:`
                : `La suite — ${batch.length} adresse${batch.length > 1 ? "s" : ""} de plus :`;
            const seen = shownBefore + batch.length;
            const outro = lang === "en"
              ? `📍 ${seen} of ${poolIds.length} shown${restAfter > 0 ? ` — want the last ${restAfter}?` : "."}`
              : lang === "ar"
                ? `📍 ${seen} من ${poolIds.length}${restAfter > 0 ? ` — أعرض الباقي (${restAfter})؟` : "."}`
                : `📍 ${seen} adresses affichées sur ${poolIds.length}${restAfter > 0 ? ` — je te montre les ${restAfter} dernières ?` : "."}`;
            const built = await buildPinnedAnswer(admin, batch, host, lang, null, {
              route: "pool_more", heading, outro, total: poolIds.length, poolIds,
            }).catch((e) => {
              console.error("[embed-ai-chat-v2] pool_more_failed", String(e));
              return null;
            });
            if (built) {
              route = "discover";
              resultsCount = built.shown;
              emit(built.text);
              if (built.mapPayload?.businesses?.length) {
                emit(`\n\n<!--SHOW_ON_MAP:${JSON.stringify(built.mapPayload)}-->`);
              }
              emit(`\n\n<!--KNOWN_BUSINESSES:${JSON.stringify(built.knownBusinesses)}-->`);
              emit(`\n\n<!--POOL_BUSINESS_IDS:${JSON.stringify({ ids: poolIds, city: scopeCity })}-->`);
              await finish(true);
              return;
            }
          } else {
            route = "discover";
            emit(lang === "en"
              ? `📍 You've already seen all ${poolIds.length} addresses from that search.`
              : lang === "ar"
                ? `📍 لقد رأيت جميع العناوين (${poolIds.length}) من هذا البحث.`
                : `📍 Tu as déjà vu les ${poolIds.length} adresses de cette recherche.`);
            await finish(true);
            return;
          }
        }


        // Article de blog pertinent (clic suggestion, texte libre ou vocal) : détecté
        // AVANT toute route déterministe (celles-ci sortent en `return`). Il n'est
        // jamais un résultat : émis en fin de tour comme simple option cliquable.
        if (userMessage.trim().length >= 6) {
          const posts = await fetchBlogPostsCached(admin).catch(() => []);
          const match = matchBlogArticle(userMessage, lang, posts, host?.id ?? "", host?.name ?? null);
          if (match) articleTeaser = buildArticleTeaser(match, lang) || null;
        }


        // 3bis. AUTORITÉ CURATÉE (zéro token) — une suggestion/relance pointant vers
        // un article de blog ou des établissements épinglés fait loi : ni le
        // classifieur ni le résolveur taxonomique ne peuvent la remplacer ou la
        // « compléter » avec des résultats de recherche.
        // Texte libre : on rapproche d'abord la phrase tapée d'un libellé de
        // suggestion staff (matcher partagé) → taper la phrase == cliquer la suggestion.
        if (!suggestionId && !followupId) {
          const m = await matchCuratedByText(admin, { text: userMessage, surface, crossSurface: true })
            .catch(() => null);
          if (m) {
            suggestionId = m.id;
            suggestionFromText = true;
            console.log("[embed-ai-chat-v2] curated_text_match", JSON.stringify(m));
          }
        }
        if (suggestionId || followupId) {
          const curated = await loadCuratedTargets(admin, {
            suggestionId, followupId, businessId: host?.id ?? null,
          }).catch((e) => {
            console.error("[embed-ai-chat-v2] curated_lookup_failed", String(e));
            return null;
          });
          // Placeholders du libellé staff résolus UNE seule fois, ici : le libellé
          // est réinjecté verbatim dans les titres/headings de la réponse.
          if (curated?.label) curated.label = applyLabelPlaceholders(curated.label, host);
          // Le clic initial (message == libellé) ou une relance explicite gardent la cible.
          const norm = (s: string) => normalize(s).replace(/[?!.\s]+$/g, "").trim();
          const isInitialClick = !!(curated?.label && norm(userMessage) === norm(curated.label));
          const keepCurated = !!curated && (!!followupId || isInitialClick || suggestionFromText || !priorIds.length);


          // ── ROUTE IMPOSÉE EN BACK-OFFICE (`route_override`) ────────────────
          // Autorité absolue : aucune détection d'intention sur le libellé.
          // `search_businesses` / `llm` laissent volontairement passer le flux normal.
          const forcedKey = curated?.routeOverride ?? null;
          if (curated && keepCurated && isForcedRouteKey(forcedKey)) {
            const hostRadius = RADIUS_OPTIONS.includes(Number(host?.poi_radius_km)) ? Number(host?.poi_radius_km) : 1;
            const forced = await runForcedRoute({
              admin,
              key: forcedKey,
              lang,
              host,
              priorIds,
              userMessage,
              scopeCity,
              radiusKm: requestedRadiusKm ?? curated.radiusKm ?? hostRadius,
            }).catch((e) => {
              console.error("[embed-ai-chat-v2] forced_route_failed", forcedKey, String(e));
              return null;
            });
            console.log("[embed-ai-chat-v2] forced_route", JSON.stringify({ forcedKey, applied: !!forced }));
            if (forced) {
              route = forced.route;
              resultsCount = forced.resultsCount;
              emit(forced.text);
              if (forced.mapBusinesses?.length) emit(`\n\n${forcedMapMarker(forced.mapBusinesses)}`);
              if (forced.knownBusinesses?.length) {
                emit(`\n\n<!--KNOWN_BUSINESSES:${JSON.stringify(forced.knownBusinesses)}-->`);
              }
              await finish(true);
              return;
            }
            if (forcedKey !== "search_businesses" && forcedKey !== "llm") fallbackReason = "no_results";
          }



          // Article de blog lié : il ne remplace PAS les résultats. Le moteur
          // calcule ses propres résultats et propose de consulter l'article.
          if (curated && keepCurated && curated.blogPostIds.length && !articleTeaser) {
            const posts = await fetchBlogPostsCached(admin).catch(() => []);
            const post = curated.blogPostIds.map((id) => posts.find((p) => p.id === id)).filter(Boolean)[0];
            if (post) articleTeaser = buildArticleTeaser(post, lang) || null;
          }


          // Feed vidéo curaté (mode = 'video_feed') : le tour renvoie des vidéos,
          // pas des fiches. Route déterministe partagée (parité V1 / club).
          if (curated && keepCurated && String(curated.mode || "").trim() === "video_feed") {
            const built = await buildVideoFeedAnswer(admin, {
              badgeIds: curated.badgeIds,
              pinnedBusinessIds: curated.pinnedBusinessIds,
              label: curated.label,
              lang: lang as any,
              city: scopeCity,
            }).catch((e) => {
              console.error("[embed-ai-chat-v2] video_feed_failed", String(e));
              return null;
            });
            if (built) {
              route = built.route;
              resultsCount = built.count;
              emit(built.text);
              emit(videoFeedMarker(built.payload));
              await finish(true);
              return;
            }
          }

          // Agenda curaté (mode = 'events') : le tour renvoie des événements
          // #Agenda de la ville active, pas des fiches. Parité V1.
          if (curated && keepCurated && String(curated.mode || "").trim() === "events") {
            const { from, to } = weekendWindow();
            const city = scopeCity || host?.city || "Marrakech";
            console.log("[embed-ai-chat-v2] events_route_start", JSON.stringify({ city: scopeCity || host?.city || null, from, to }));
            const events = await fetchAgendaEvents(admin, {
              city, from, to, limit: 10,
              badgeIds: curated.badgeIds?.length ? curated.badgeIds : null,
            }).catch((e) => {
              console.error("[embed-ai-chat-v2] events_route_failed", String(e));
              return [] as any[];
            });
            console.log("[embed-ai-chat-v2] events_route_done", events.length);
            route = "events";
            resultsCount = events.length;
            emit(buildEventsWeekendAnswer(events, host, city, from, to, lang as any));
            if (events.length) emit(`\n\n${eventsSnapshotMarker(events, city, curated.label || null)}`);
            await finish(true);
            return;
          }



          // Corpus clos SEULEMENT si l'entrée n'a aucun filtre taxonomique : sinon
          // les épinglés sont mis en avant en tête des résultats filtrés.
          const curatedHasTaxo = !!curated && (curated.commodities.length || curated.badgeIds.length || curated.subcategoryNames.length || curated.serviceNames.length) > 0;
          if (curated && keepCurated && curated.pinnedBusinessIds.length && !curatedHasTaxo) {
            const built = await buildPinnedAnswer(
              admin, curated.pinnedBusinessIds, host, lang, curated.label,
            ).catch((e) => {
              console.error("[embed-ai-chat-v2] pinned_route_failed", String(e));
              return null;
            });
            if (built) {
              route = built.route;
              resultsCount = built.shown;
              emit(built.text);
              if (built.mapPayload?.businesses?.length) {
                emit(`\n\n<!--SHOW_ON_MAP:${JSON.stringify(built.mapPayload)}-->`);
              }
              emit(`\n\n<!--KNOWN_BUSINESSES:${JSON.stringify(built.knownBusinesses)}-->`);
              if (built.poolIds?.length) {
                emit(`\n\n<!--POOL_BUSINESS_IDS:${JSON.stringify({ ids: built.poolIds, city: scopeCity })}-->`);
              }

              await finish(true);
              return;
            }
            fallbackReason = "no_results";
          }

          // Filtre déterministe curaté : commodités / badges / sous-catégories liés
          // à la suggestion en backoffice → filtre DUR (engagements ou business-search),
          // parité V1. Aucun classifieur, aucun générateur.
          if (curated && keepCurated && (curated.commodities.length || curated.badgeIds.length || curated.subcategoryNames.length || curated.serviceNames.length)) {
            const built = await buildFilteredAnswer(admin, host, lang, {
              badgeIds: curated.badgeIds,
              subcategoryNames: curated.subcategoryNames,
              serviceNames: curated.serviceNames,
              commodities: curated.commodities,
              label: curated.label,
              pinnedIds: curated.pinnedBusinessIds,


              scopeCity,
              maxResults: CFG.maxResults,
              supabaseUrl: SUPABASE_URL,
              serviceKey: SERVICE,
            }).catch((e) => {
              console.error("[embed-ai-chat-v2] curated_filter_failed", String(e));
              return null;
            });
            if (built) {
              route = built.route;
              resultsCount = built.shown;
              emit(built.text);
              if (built.mapPayload?.businesses?.length) {
                emit(`\n\n<!--SHOW_ON_MAP:${JSON.stringify(built.mapPayload)}-->`);
              }
              emit(`\n\n<!--KNOWN_BUSINESSES:${JSON.stringify(built.knownBusinesses)}-->`);
              if (built.poolIds?.length) {
                emit(`\n\n<!--POOL_BUSINESS_IDS:${JSON.stringify({ ids: built.poolIds, city: scopeCity })}-->`);
              }

              await finish(true);
              return;
            }
            fallbackReason = "no_results";
          }
        }
        // ── Classe A — routes déterministes (zéro token) ────────────────────
        // 0. Marées (widget marées/houle/vent) — prioritaire sur la météo.
        if (isTidesIntent(userMessage)) {
          route = "tides";
          const coast = resolveTidesCity(userMessage, scopeCity);
          emit(`${tidesIntro(coast.name, lang)}\n\n<!--TIDES_FORECAST:${JSON.stringify({ city: coast.slug, city_name: coast.name })}-->`);
          await finish(true);
          return;
        }

        // 1. Météo
        if (isWeatherIntent(userMessage)) {
          route = "weather";
          const city = scopeCity;
          const { data, error } = await admin.functions.invoke("get-weather", { body: { city } });
          if (!error && data && !(data as any).error) {
            const w = data as any;
            const intro = {
              fr: `Voici la météo à **${w.city_name || city}** et la tendance des 3 prochains jours. 👇`,
              en: `Here's the weather in **${w.city_name || city}** and the 3-day trend. 👇`,
              ar: `إليك حالة الطقس في **${w.city_name || city}** والتوقعات للأيام الثلاثة القادمة. 👇`,
            }[lang];
            const payload = {
              city_name: w.city_name || city, temp: w.temp, feels_like: w.feels_like,
              temp_min: w.temp_min, temp_max: w.temp_max, humidity: w.humidity,
              wind_speed: w.wind_speed, description: w.description || "", icon: w.icon || "",
              hourly: Array.isArray(w.hourly) ? w.hourly.slice(0, 8) : [],
              daily: Array.isArray(w.daily) ? w.daily.slice(0, 3) : [],
            };
            emit(`${intro}\n\n<!--WEATHER_FORECAST:${JSON.stringify(payload)}-->`);
            await finish(true);
            return;
          }
          hadError = true;
          fallbackReason = "route_failed";
        }

        // 1bis. Classements horaires (« qui ouvre le plus tôt », « qui ferme le plus tard »)
        // et filtre « ouvert maintenant / ce soir » : AVANT la route horaires générique,
        // sinon le libellé (« ferme », « tard ») partait sur la simple liste d'horaires.
        if (priorIds.length && (isOpensFirstIntent(userMessage) || isClosesLastIntent(userMessage))) {
          route = "opening";
          const rankMode = isOpensFirstIntent(userMessage) ? "opens_first" : "closes_last";
          const answer = await buildHoursRanking(admin, priorIds, rankMode, lang).catch(() => null);
          if (answer) {
            resultsCount = priorIds.length;
            emit(answer);
            await finish(true);
            return;
          }
          fallbackReason = "no_results";
        }

        if (priorIds.length) {
          const filterIntent = parseOpenFilterIntent(userMessage);
          if (filterIntent) {
            route = "opening";
            const answer = await buildOpenFilter(admin, priorIds, filterIntent, lang).catch(() => null);
            if (answer) {
              resultsCount = priorIds.length;
              emit(answer);
              await finish(true);
              return;
            }
            fallbackReason = "no_results";
          }
        }

        // 2. Horaires — sans hôte, seuls les établissements déjà présentés répondent.
        if (isHoursIntent(userMessage) && (priorIds.length || host)) {

          route = "opening";
          const answer = priorIds.length
            ? await buildHoursForBusinesses(admin, priorIds.slice(0, CFG.maxResults), lang)
            : buildHoursAnswer(host, lang);
          if (answer) {
            resultsCount = priorIds.length ? Math.min(priorIds.length, CFG.maxResults) : 1;
            emit(answer);
            await finish(true);
            return;
          }
          fallbackReason = "no_results";
        }

        // 3. Réservation
        if (isBookingIntent(userMessage) && (priorIds.length || host)) {
          route = "booking";
          const ids = priorIds.slice(0, CFG.maxResults);
          const answer = priorIds.length
            ? await buildBookingForBusinesses(admin, ids, lang)
            : buildBookingAnswer(host, lang);
          if (answer) {
            resultsCount = priorIds.length ? Math.min(priorIds.length, CFG.maxResults) : 1;
            emit(answer);
            // Cartes résultat IA (source unique de présentation + CTA Réservez / WhatsApp).
            if (ids.length) {
              const rows = await fetchPriorFull(admin, ids).catch(() => []);
              const ordered = ids.map((id) => rows.find((r: any) => r.id === id)).filter(Boolean);
              if (ordered.length) emit(toMapMarker(ordered as any[], null));
            }
            await finish(true);
            return;
          }
          fallbackReason = "no_results";
        }




        // 4. Rappels sur les résultats déjà affichés (comptage, ordinal, classement)
        if (priorIds.length) {
          const prior = extractPriorOrderedBusinesses(uiMessages as any[], host?.id ?? "");
          if (isCountIntent(userMessage)) {
            route = "discover";
            resultsCount = priorIds.length;
            emit(buildCountAnswer(priorIds.length, lang));
            await finish(true);
            return;
          }
          const ordinals = parseOrdinalIntent(userMessage, prior.length);
          if (ordinals?.length && prior.length) {
            route = "business_qa";
            resultsCount = ordinals.length;
            emit(buildOrdinalPick(prior, ordinals, lang));
            await finish(true);
            return;
          }
          const ratingMode = isRatingRankingIntent(userMessage);
          if (ratingMode) {
            route = "discover";
            const answer = await buildRatingRanking(admin, priorIds, ratingMode, lang);
            if (answer) {
              resultsCount = priorIds.length;
              emit(answer);
              await finish(true);
              return;
            }
          }
          const distanceMode = isDistanceRankingIntent(userMessage);
          if (distanceMode && host) {
            route = "nearby";
            const answer = await buildDistanceRanking(admin, host, priorIds, distanceMode, lang).catch(() => null);
            if (answer) {
              resultsCount = priorIds.length;
              emit(answer);
              await finish(true);
              return;
            }
          }
          if (isDistanceListIntent(userMessage) && host) {
            route = "nearby";
            const answer = await buildDistanceList(admin, host, priorIds, lang);
            if (answer) {
              resultsCount = priorIds.length;
              emit(answer);
              await finish(true);
              return;
            }
          }
          if (isDescribeIntent(userMessage)) {
            const facet = parseDescribeFacet(userMessage);
            const answer = await buildDescribePriors(admin, priorIds, facet, lang, host).catch(() => null);
            if (answer) {
              route = "business_qa";
              resultsCount = priorIds.length;
              emit(answer);
              await finish(true);
              return;
            }
          }
        }


        // 4bis. Relance « à proximité de <hôte> » : quand un corpus vient d'être
        // présenté, la proximité est un RAFFINEMENT de ce corpus complet (les 19
        // trouvées, pas les 6 affichées), filtré au rayon de proximité actif
        // (rayon choisi par l'utilisateur, sinon rayon de la fiche, sinon 1 km).
        if (host && poolIds.length) {
          const hostNameNorm = normalize(host.name || "");
          const msgNorm = normalize(userMessage);
          const mentionsHost = !!hostNameNorm && msgNorm.includes(hostNameNorm);
          if (isProximityIntent(userMessage) || (mentionsHost && /(proximite|autour|pres|nearby|around|close|near)/.test(msgNorm))) {
            const hostRadius = RADIUS_OPTIONS.includes(Number(host.poi_radius_km)) ? Number(host.poi_radius_km) : 1;
            const radius = parseInlineRadiusKm(userMessage) ?? requestedRadiusKm ?? hostRadius;
            const built = await buildProximityFromPool(admin, host, poolIds, radius, lang).catch((e) => {
              console.error("[embed-ai-chat-v2] proximity_pool_failed", String(e));
              return null;
            });
            if (built) {
              route = "nearby";
              resultsCount = built.kept.length;
              emit(built.text);
              emit(`\n\n<!--KNOWN_BUSINESSES:${JSON.stringify(built.kept.map((b: any) => ({ id: b.id, slug: b.slug || null, name: b.name })))}-->`);
              emit(`\n\n<!--POOL_BUSINESS_IDS:${JSON.stringify({ ids: poolIds, city: scopeCity })}-->`);
              await finish(true);
              return;
            }
          }
        }

        // 5. Panorama « que faire à proximité ? » (déterministe, Structure du Front)

        // Autorité du résolveur : si la requête contient une cible taxonomique réelle
        // (« piscine à proximité »), ce n'est plus un panorama générique → recherche ciblée.
        // Sans hôte (/search, /club) il n'y a pas de point d'ancrage : route ignorée.
        const hasResolvedIntent = !!resolution && resolution.targets.some(
          (t) => t.type === "category" || t.type === "subcategory" || t.type === "service" || t.type === "badge",
        );
        if (
          host &&
          ((isNearbyOverviewIntent(userMessage, host.name) && !hasResolvedIntent) ||
          (isProximityIntent(userMessage) && !suggestionId && !hasResolvedIntent))
        ) {
          route = "nearby";
          const hostCategoryNames = new Set<string>(
            [...(Array.isArray(host.categories) ? host.categories : []), host.main_category]
              .map(normalize).filter(Boolean),
          );
          const hostRadiusKm = RADIUS_OPTIONS.includes(Number(host.poi_radius_km)) ? Number(host.poi_radius_km) : 1;
          const effectiveRadiusKm = requestedRadiusKm ?? hostRadiusKm;
          const overview = await buildNearbyOverview(admin, host, hostCategoryNames, lang, effectiveRadiusKm).catch((e) => {
            console.error("[embed-ai-chat-v2] nearby_failed", e);
            return "";
          });
          if (overview && overview.trim()) {
            emit(overview);
            await finish(true);
            return;
          }
          fallbackReason = "no_results";
        }




        // ── Classe B — classifieur, puis recherche déterministe ─────────────
        aiClass = "B";
        route = "discover";
        // Continuité : route + catégorie du tour précédent (une lecture DB, zéro token).
        let priorRoute: string | null = null;
        let priorCategory: string | null = null;
        if (chatId) {
          const { data: lastTurn } = await admin
            .from("ai_conversation_turns")
            .select("route_taken, tools_called")
            .eq("chat_id", chatId)
            .order("created_at", { ascending: false })
            .limit(1);
          const t: any = lastTurn?.[0];
          if (t) {
            priorRoute = t.route_taken || null;
            const c = (t.tools_called as any)?.category;
            priorCategory = typeof c === "string" && c ? c : null;
          }
        }
        const priorNames = priorIds.length
          ? (await fetchPriorFull(admin, priorIds.slice(0, 3))).map((b: any) => b.name).filter(Boolean)
          : [];
        const cls = await classify(
          {
            message: userMessage,
            surface,
            focus: {
              last_business_ids: priorIds.length ? priorIds.slice(0, 3) : host ? [host.id] : [],
              last_business_names: priorNames.length ? priorNames : host ? [host.name] : [],
              last_route: priorRoute as any,
              last_category: priorCategory,
              active_city: host?.city || activeCity || null,
            },
          },
          LOVABLE_API_KEY,
        );
        tokensIn += cls.tokensIn;
        tokensOut += cls.tokensOut;
        confidence = cls.output?.confidence ?? null;
        lastCategory = cls.output?.category ?? priorCategory;

        if (cls.error || !cls.output) {
          hadError = true;
          fallbackReason = "route_failed";
        }

        const out = cls.output;
        const confident = !!out && out.confidence >= CFG.confidenceThreshold;

        if (host && out && confident && out.intent === "business_qa" && !priorIds.length) {
          // Question sur l'hôte : contexte hôte seul, synthèse générative courte.
          route = "business_qa";
        }

        let results: any[] = [];
        let totalFound = 0;
        /** Corpus COMPLET de la recherche (avant coupe d'affichage) : mémorisé pour les relances. */
        let searchPoolIds: string[] = [];

        // Recherche déterministe partagée : appelée avec les champs structurés du
        // classifieur, ou en secours avec le message brut quand il n'est pas confiant.
        const runSearch = async (baseQuery: string, city: string, excluded: string[], requiredServices: string[] = []) => {
          const views = detectViewIntent(userMessage);
          cityDetected = city;
          try {
            const r = await fetch(`${SUPABASE_URL}/functions/v1/business-search`, {
              method: "POST",
              headers: { Authorization: `Bearer ${SERVICE}`, apikey: SERVICE, "Content-Type": "application/json" },
              body: JSON.stringify({
                query: baseQuery,
                spoken: baseQuery,
                language: lang,
                pageSize: 30,
                offset: 0,
                compact: "card",
                city,
              }),
            });
            const json = await r.json().catch(() => null);
            const all: any[] = Array.isArray(json?.businesses) ? json.businesses : [];
            let kept = all.filter((b: any) => {
              if (host && b.id === host.id) return false;
              if (!excluded.length) return true;
              const hay = normalize(`${b.main_category || ""} ${(b.categories || []).join(" ")}`);
              return !excluded.some((x) => hay.includes(x));
            });

            // ── Filtre dur sur service qualifié ────────────────────────────────
            // Quand la demande nomme un service typé dans la même catégorie que le
            // type de lieu (« restaurants italiens » → Cuisine italienne, Restauration),
            // le service devient un filtre, jamais un mot-clé : c'est ce qui écarte
            // « Cuisine méditerranéenne » ramenée par la similarité textuelle.
            // Pas de repli silencieux : zéro correspondance reste zéro.
            if (requiredServices.length && kept.length) {
              const ids = kept.map((b: any) => b.id);
              const { data: rows } = await admin.from("businesses").select("id, services").in("id", ids);
              const wanted = new Set(requiredServices.map((s) => normalize(s)));
              const okIds = new Set(
                (rows ?? [])
                  .filter((r: any) => (r.services ?? []).some((s: string) => wanted.has(normalize(s))))
                  .map((r: any) => r.id),
              );
              const before = kept.length;
              kept = kept.filter((b: any) => okIds.has(b.id));
              console.log("[embed-ai-chat-v2] service_hard_filter", JSON.stringify({ requiredServices, before, after: kept.length }));
            }



            // Filtre de vue : élimination stricte quand une vue est demandée.
            if (views.hasViewIntent && kept.length && (views.points.length || views.panoramas.length)) {
              const ids = kept.map((b: any) => b.id);
              const [{ data: coords }, { data: bb }] = await Promise.all([
                admin.from("businesses").select("id, latitude, longitude, services, description, name").in("id", ids),
                admin.from("business_badges").select("business_id, badges(name)").in("business_id", ids),
              ]);
              const coordById = new Map((coords || []).map((c: any) => [c.id, c]));
              const badgesById = new Map<string, string[]>();
              for (const row of (bb as any[]) || []) {
                const name = (row as any).badges?.name;
                if (!name) continue;
                const arr = badgesById.get(row.business_id) || [];
                arr.push(name);
                badgesById.set(row.business_id, arr);
              }
              kept = kept.filter((b: any) => {
                const c: any = coordById.get(b.id) || {};
                const badgeNames = badgesById.get(b.id) || [];
                const text = `${b.name || ""} ${b.hook_fr || ""} ${c.description || ""}`;
                const attrs = { services: c.services, badgeNames };
                const pointOk = views.points.length
                  ? views.points.some((p) =>
                      (withinPointRadius(p, c.latitude, c.longitude) && hasVantage(attrs, text)) ||
                      hasPointViewProof(p, text))
                  : true;
                const panoOk = views.panoramas.length
                  ? views.panoramas.some((p) => hasPanoramaAttribute(p, attrs) || hasPanoramaProof(p, text))
                  : true;
                return pointOk && panoOk;
              });
            }

            totalFound = kept.length;
            searchPoolIds = kept.map((b: any) => String(b.id)).slice(0, 30);
            results = kept.slice(0, CFG.maxResults);
          } catch (e) {
            console.error("[embed-ai-chat-v2] search_failed", e);
            hadError = true;
            fallbackReason = "route_failed";
          }
          resultsCount = results.length;
        };

        // ── Autorité du résolveur : le classifieur propose, le vocabulaire réel tranche ──
        // Exclusions du classifieur appliquées AU RÉSOLVEUR : sans ça « pas un hôtel »
        // faisait résoudre « hotel » en sous-catégorie Hôtel et polluait la requête.
        const excludedTerms = ((out?.exclude || []) as string[]).map(normalize).filter(Boolean);
        const isExcluded = (value: string) => {
          const v = normalize(value);
          return excludedTerms.some((x) => v.includes(x) || x.includes(v));
        };
        // ── Quartier = filtre, jamais une requête ───────────────────────────
        // « medina » existe AUSSI comme service en base : il sortait en terme fort et
        // relançait une recherche ville entière au lieu d'affiner la sélection. Si le mot
        // désigne un quartier réel de la ville du périmètre, il est retiré du vocabulaire
        // de recherche et traité comme filtre déterministe sur le corpus précédent.
        const nbMatch = (priorIds.length || poolIds.length)
          ? await resolveNeighborhoodInMessage(admin, userMessage, scopeCity)
          : null;
        const nbAliases = new Set(nbMatch?.aliases || []);
        const isNeighborhoodWord = (value: string) => nbAliases.has(normalize(value));
        // Cibles fortes (exact / phrase / synonyme curé) issues du message utilisateur,
        // ordonnées par proximité lexicale avec le terme réellement tapé : « piscine »
        // doit sortir « Piscine » avant « Beach club » (même sous-catégorie déclenchée).
        const lexicalRank = (t: { value: string; matched: string }) => {
          const v = normalize(t.value);
          const m = normalize(t.matched);
          if (v === m) return 0;
          if (v.startsWith(m)) return 1;
          if (v.includes(m)) return 2;
          return 3;
        };
        const strongTargets = resolution
          ? resolution.targets
              .filter(
                (t) =>
                  t.strength !== "expansion" &&
                  (t.type === "subcategory" || t.type === "category" || t.type === "service") &&
                  !isExcluded(t.value) &&
                  !isNeighborhoodWord(t.value),
              )
              .sort((a, b) => lexicalRank(a) - lexicalRank(b))
          : [];
        // On ne garde que les cibles aussi proches que la meilleure : mélanger « Piscine »
        // et « Beach club » dans la même requête ramène des adresses hors sujet.
        const bestRank = strongTargets.length ? lexicalRank(strongTargets[0]) : 9;
        const strongTerms = [
          ...new Set(strongTargets.filter((t) => lexicalRank(t) === bestRank).map((t) => t.value)),
        ].slice(0, 2);
        // Expansion par mot : bruyante, donc utilisée seulement quand rien de fort ne sort
        // (c'est ce qui rattrape « piscine », absent des catégories mais présent en service).
        const expansionTerms = resolution
          ? resolution.targets
              .filter((t) => t.type === "service" && t.strength === "expansion" && !isExcluded(t.value) && !isNeighborhoodWord(t.value))
              .map((t) => t.value)
              .slice(0, 2)
          : [];
        // ── Spécialisation : service de la MÊME catégorie que le type de lieu demandé ──
        // « restaurants français » résolvait « Restaurant » seul : le moteur perdait le
        // discriminant et narrait un corpus générique. On réinjecte le service qualifié
        // (Cuisine française, catégorie Restauration) quand le mot qui l'a déclenché
        // n'est pas déjà porté par la cible forte. Le garde-fou de catégorie du résolveur
        // a déjà écarté les services d'une autre catégorie (Parmesan, Safran).
        const strongHay = normalize(strongTerms.join(" "));
        const specializingTerms = resolution && strongTerms.length
          ? [
              ...new Set(
                qualifiedServiceTargets(resolution)
                  .filter(
                    (t) =>
                      !isExcluded(t.value) &&
                      !isNeighborhoodWord(t.value) &&
                      !strongHay.includes(normalize(t.matched)) &&
                      !strongTerms.some((s) => normalize(s) === normalize(t.value)),
                  )
                  .map((t) => t.value),
              ),
            ].slice(0, 1)
          : [];
        if (specializingTerms.length) {
          console.log("[embed-ai-chat-v2] specializing_service", JSON.stringify({ strongTerms, specializingTerms }));
        }

        const resolvedCityRaw = resolution
          ? (strongTargetsOfType(resolution, "city")[0] ?? targetsOfType(resolution, "city")[0] ?? null)
          : null;
        // Règle unique de périmètre : seule une ville explicitement nommée (résolveur
        // ou détection lexicale) peut sortir de la ville du master. `out.city` du
        // classifieur n'est plus une autorité (inventions possibles).
        const searchCity = resolveCityScope({
          hostCity: host?.city, activeCity, explicitCity: explicitCity || resolvedCityRaw,
        }) as string;
        const resolvedCity = resolvedCityRaw;

        // La catégorie du classifieur n'est retenue que si elle existe vraiment en base.
        let classifierCategoryValid = false;
        let validatedCategory: string | null = null;
        const proposed = out?.category || null;
        if (proposed) {
          try {
            const chk = await resolveWithAdmin(admin, proposed);
            const hit = chk.targets.find(
              (t) => (t.type === "category" || t.type === "subcategory" || t.type === "service") && t.strength !== "expansion",
            );
            if (hit) { classifierCategoryValid = true; validatedCategory = hit.value; }
          } catch (e) {
            console.warn("[embed-ai-chat-v2] category validation failed", String(e));
          }
        }
        const authoritySource = strongTerms.length
          ? "resolver_strong"
          : classifierCategoryValid
            ? "classifier_validated"
            : expansionTerms.length
              ? "resolver_expansion"
              : priorCategory
                ? "prior_category"
                : "raw_message";
        // Continuité : on mémorise un terme réel, jamais une invention du classifieur.
        lastCategory = strongTerms[0] || validatedCategory || expansionTerms[0] || priorCategory;

        // ── Relance contextuelle : on répond SUR le corpus déjà présenté ─────
        // Le résolveur est l'autorité du vocabulaire : si le message de l'utilisateur
        // ne contient AUCUNE cible réelle (catégorie / sous-catégorie / service) ni
        // ville, il n'y a pas de nouvelle demande de recherche — c'est une question
        // sur ce qui vient d'être présenté (« Que faire sur place ? »).
        // Une catégorie inventée par le classifieur (« activite ») ne suffit pas :
        // c'est elle qui déclenchait une recherche ville entière hors sujet.
        // ── Autorité « nom propre » : une demande nominative prime sur la taxonomie ──
        const nameHit = await matchBusinessNameInMessage(admin, userMessage).catch(() => null);
        if (nameHit) {
          console.log("[embed-ai-chat-v2] name_authority", nameHit.name);
        }

        const contextualFollowUp =
          !nameHit &&
          priorIds.length > 0 &&
          !strongTerms.length &&
          !expansionTerms.length &&
          !resolvedCity;
        if (contextualFollowUp) {
          route = "business_qa";
          fallbackReason = fallbackReason || "contextual_followup";
          console.log("[embed-ai-chat-v2] contextual_followup", JSON.stringify({
            priorIds: priorIds.length, classifierCategory: out?.category ?? null, city: out?.city ?? null,
          }));
        }


        if (nameHit) {
          // Recherche nominative : business-search isole le nom exact (ville de la fiche).
          await runSearch(nameHit.name, nameHit.city || searchCity, []);
        }

        if (!nameHit && !contextualFollowUp && out && confident && (out.intent === "search" || out.intent === "compare")) {
          const views = detectViewIntent(userMessage);
          const panoramaHints = views.panoramas.map((p) => p.attributeNames[0]);
          const excluded = excludedTerms;
          const excludesLodging = excluded.some((x) => /hotel|riad|hebergement|maison\s?d/.test(x));
          // Un repère ponctuel (Koutoubia) se traite par rayon + preuve de point de
          // vue, pas par mot-clé : n'injecter aucun indice « rooftop » ici.
          const hintParts = views.points.length && !excludesLodging ? [] : panoramaHints;
          const coreTerms = strongTerms.length
            ? [...strongTerms, ...specializingTerms]
            : classifierCategoryValid
              ? [validatedCategory as string]
              : expansionTerms.length
                ? expansionTerms
                : [priorCategory].filter(Boolean) as string[];

          const baseQuery = [...coreTerms, ...hintParts].filter(Boolean).join(" ").slice(0, 200)
            || userMessage.slice(0, 200);
          // Services qualifiés forts → filtre dur (l'expansion par mot reste du ranking).
          const requiredServices = resolution
            ? [...new Set(qualifiedServiceTargets(resolution).filter((t) => t.strength !== "expansion").map((t) => t.value))]
            : [];
          await runSearch(baseQuery, searchCity, excluded, requiredServices);

        }

        // Filet de secours : le classifieur n'a pas tranché (ou sa requête structurée
        // n'a rien donné) → termes résolus, sinon message brut comme la v1.
        if (!results.length && route !== "business_qa") {
          const rawExcluded = ((out?.exclude || []) as string[]).map(normalize).filter(Boolean);
          const rescueQuery = strongTerms.length
            ? strongTerms.join(" ")
            : expansionTerms.length
              ? expansionTerms.join(" ")
              : userMessage.slice(0, 200);
          await runSearch(
            rescueQuery,
            searchCity,
            rawExcluded,
          );
          if (results.length) fallbackReason = fallbackReason || "confidence_low";
        }
        resolutionAuthority = authoritySource;

        if (!results.length) fallbackReason = fallbackReason || "no_results";


        if (!confident && !fallbackReason) fallbackReason = "confidence_low";

        // ── Classe C — synthèse générative sur contexte déterministe ────────
        aiClass = "C";
        const gateway = createLovableAiGatewayProvider(LOVABLE_API_KEY);

        // Corpus de la relance contextuelle : règle unique — on filtre dans la
        // TOTALITÉ des résultats trouvés au tour précédent (marqueur POOL_BUSINESS_IDS,
        // ex. 30 adresses), jamais dans les seules 6 affichées.
        const followUpPoolIds = (poolIds.length ? poolIds : priorIds).slice(0, 30);
        let priorFull = (contextualFollowUp || (priorIds.length && !results.length))
          ? await fetchPriorFull(admin, followUpPoolIds).catch(() => [])
          : [];

        // ── Filtre quartier déterministe (STRICT) ───────────────────────────
        // Un quartier n'est retenu que s'il existe en base DANS la ville du périmètre
        // (Médina existe dans 9 villes) : accent-insensible + alias de recherche.
        // Strict : si le corpus n'a rien dans ce quartier → on n'affiche rien et on
        // propose l'élargissement à la ville. Aucun repli silencieux.
        let strictBlock: string | null = null;
        if (contextualFollowUp && priorFull.length) {
          const nb = nbMatch;
          if (nb) {
            const filtered = filterPoolByNeighborhood(priorFull as any[], nb);
            console.log("[embed-ai-chat-v2] neighborhood_filter", JSON.stringify({
              neighborhood: nb.name, city: nb.city, matched: nb.matched,
              pool: priorFull.length, kept: filtered.length,
            }));
            if (filtered.length) {
              priorFull = filtered as any[];
            } else {
              strictBlock = neighborhoodEmptyMessage(nb, lang);
              fallbackReason = "neighborhood_empty_strict";
            }
          }
        }


        // Contexte éditorial partagé (TXT IA + popups d'images + offres) — même
        // module que /search et /club pour éviter toute divergence de richesse.
        let editorialCtx = "";
        try {
          const editorialIds = [
            ...(host?.id ? [String(host.id)] : []),
            ...results.map((b: any) => b?.id).filter(Boolean).map(String),
            ...priorFull.map((b: any) => b?.id).filter(Boolean).map(String),
          ];
          if (editorialIds.length) {
            const nameById: Record<string, string> = {};
            if (host?.id) nameById[String(host.id)] = host.name || "";
            for (const b of results as any[]) if (b?.id) nameById[String(b.id)] = b.name || "";
            for (const b of priorFull as any[]) if (b?.id) nameById[String(b.id)] = b.name || "";
            const bundle = await loadEditorialBundle(admin, {
              businessIds: [...new Set(editorialIds)],
              perBusiness: 5,
              limit: 12,
              lang,
            });
            editorialCtx = formatEditorialBundle(bundle, nameById);
            if (editorialCtx) {
              const counts = (type: string) => bundle.items.filter((i: any) => i.type === type).length;
              console.log(
                `[embed-v2] Editorial ctx: ${counts("description")} desc, ${counts("hook")} hooks, ${counts("popup")} popups, ${counts("offer")} offres, ${counts("service")} services, ${counts("text")} TXT IA (${editorialIds.length} businesses)`,
              );
            }
          }
        } catch (e) {
          console.error("[embed-v2] editorial_ctx_error", String(e));
        }

        const context = [
          host ? hostContext(host, lang) : (activeCity ? `Ville active: ${activeCity}` : ""),
          results.length
            ? `Résultats trouvés (${results.length} sur ${totalFound}) — ce sont les seules adresses à présenter, présente-les toutes :\n${resultsContext(results, lang)}`
            : "",
          editorialCtx
            ? `CONTEXTE ÉDITORIAL ([DESCRIPTION] description de l'établissement, [HOOK] accroche, [IMAGE POPUP] titres et textes des photos, [SERVICE] services, [OFFRE] offres et promotions, [TXT IA] textes rédigés par l'établissement/affilié ; intègre-les naturellement, ne mets pas en avant un établissement uniquement parce qu'il a du contenu ici) :\n${editorialCtx}`
            : "",
          !results.length && priorFull.length
            ? `${contextualFollowUp ? `RELANCE CONTEXTUELLE — la question affine la sélection précédente. Le corpus ci-dessous contient la TOTALITÉ des ${priorFull.length} adresses trouvées au tour précédent (pas seulement celles affichées) : filtre dedans et présente toutes celles qui correspondent, sans proposer aucune adresse extérieure et sans lancer de nouvelle recherche.\n` : ""}Corpus des résultats trouvés dans la conversation :\n${resultsContext(priorFull as any[], lang)}`
            : "",
        ].filter(Boolean).join("\n\n");

        const system = `Tu es ${host ? `le concierge IA de ${host.name}` : "l'assistant IA One World Morocco"}. Ton: ${CFG.ton}.
Tu ne t'appuies QUE sur le contexte fourni. N'invente jamais un établissement, un prix, un horaire ou un avis.
Quand le contexte contient des résultats, tu les présentes TOUJOURS, même s'ils ne correspondent pas exactement à la demande : dans ce cas, une phrase d'introduction honnête ("pas de correspondance exacte, voici une sélection proche") puis les adresses. Ne réponds jamais que tu n'as rien trouvé alors que des résultats sont fournis.
Si le contexte ne contient aucun résultat, dis-le en une phrase et propose une reformulation.
Termine TOUJOURS par une seule question de relance courte, ancrée uniquement dans le contexte fourni (une précision, une alternative ou une étape suivante concrète : réserver, horaires, proximité). Deux options maximum dans la question, jamais d'invention.

${contextualFollowUp ? "Cette réponse est une relance contextuelle : appuie-toi à fond sur le CONTEXTE ÉDITORIAL (services, offres, textes de photos, description) pour détailler concrètement ce que l'on peut faire dans chaque établissement déjà présenté (activités, piscine, repas, expériences), sans rien inventer.\n" : ""}
Réponds en ${lang === "en" ? "anglais" : lang === "ar" ? "arabe" : "français"}, ${contextualFollowUp ? "220" : "120"} mots maximum (relance incluse), sans liste brute si tu peux faire des phrases.`;

        const history = uiMessages
          .filter((m: any) => m?.role === "user" || m?.role === "assistant")
          .slice(-CFG.historyTurns * 2)
          .map((m: any) => ({
            role: m.role as "user" | "assistant",
            content: textOf(m).replace(/<!--[\s\S]*?-->/g, "").slice(0, 2000),
          }))
          .filter((m) => m.content.trim());

        let finalText = "";
        if (strictBlock) {
          // Mode strict : réponse déterministe, aucun appel LLM, aucune adresse affichée.
          emit(strictBlock);
          finalText = strictBlock;
        } else try {
          const result = streamText({
            model: gateway(AI_MODEL),
            system,
            messages: [
              ...history.slice(0, -1),
              { role: "user", content: context ? `Contexte:\n${context}\n\nQuestion: ${userMessage}` : userMessage },
            ] as any,
            providerOptions: { lovable: { reasoningEffort: "none" } },
          });
          for await (const delta of result.textStream) {
            finalText += delta;
            emit(delta);
          }
          const usage = await result.usage.catch(() => null);
          if (usage) {
            tokensIn += (usage as any).inputTokens ?? 0;
            tokensOut += (usage as any).outputTokens ?? 0;
          }
        } catch (e) {
          console.error("[embed-ai-chat-v2] generate_failed", e);
          hadError = true;
          fallbackReason = "empty_response";
          const fb = {
            fr: "Je n'ai pas pu produire de réponse pour cette demande. Peux-tu la reformuler ?",
            en: "I couldn't produce an answer for that. Could you rephrase?",
            ar: "لم أتمكن من الإجابة. هل يمكنك إعادة صياغة السؤال؟",
          }[lang];
          emit(fb);
          finalText = fb;
        }

        // Marqueurs de fin : carte + mémoire du tour suivant.
        if (results.length) {
          // La ligne de décompte ("X adresses sur Y trouvées à …") n'est légitime que si la
          // réponse a réellement énuméré ces adresses. Sur une question méta / hors-liste,
          // elle mélangeait des noms sans rapport : dans ce cas on ne met rien.
          const normFinal = normalize(finalText);
          const cited = results.filter((b) => b?.name && normFinal.includes(normalize(String(b.name)))).length;
          const answerListsResults = cited >= 2 && cited >= Math.ceil(results.length / 2);
          const city = cityDetected || scopeCity || "";
          const disclosure = answerListsResults && city && totalFound > results.length
            ? `\n\n${buildDisclosureFromCounts(results.length, totalFound, city)}`
            : "";
          if (disclosure && !/sur\s+\d+\s+trouv/i.test(finalText)) emit(disclosure);
          emit(`\n\n${toMapMarker(results, null)}`);
          emit(`\n\n<!--KNOWN_BUSINESSES:${JSON.stringify(results.map((b) => ({ id: b.id, name: b.name })))}-->`);
          // Mémoire du corpus complet (les 30 trouvées) pour que la relance suivante
          // filtre dedans, et pas seulement dans les adresses affichées.
          if (searchPoolIds.length) {
            emit(`\n\n<!--POOL_BUSINESS_IDS:${JSON.stringify({ ids: searchPoolIds, city: cityDetected || scopeCity || null })}-->`);
          }
        } else if (priorFull.length) {
          // Relance contextuelle : cartes des seules fiches réellement citées, prises
          // dans le corpus complet du tour précédent ; le pool reste mémorisé.
          const normFinal = normalize(finalText);
          const citedFull = (priorFull as any[]).filter(
            (b) => b?.name && normFinal.includes(normalize(String(b.name))),
          );
          if (citedFull.length) {
            emit(`\n\n${toMapMarker(citedFull, null)}`);
            emit(`\n\n<!--KNOWN_BUSINESSES:${JSON.stringify(citedFull.map((b) => ({ id: b.id, name: b.name })))}-->`);
          }
          if (followUpPoolIds.length) {
            emit(`\n\n<!--POOL_BUSINESS_IDS:${JSON.stringify({ ids: followUpPoolIds, city: scopeCity || null })}-->`);
          }
        }


        await finish(true);
      } catch (e) {
        console.error("[embed-ai-chat-v2] fatal", e);
        hadError = true;
        emit("Une erreur est survenue. Réessaie dans un instant.");
        await finish(false);
      }
    },
    onError: (err) => {
      console.error("[embed-ai-chat-v2] stream_error", err);
      return String((err as Error)?.message || err);
    },
  });

  return createUIMessageStreamResponse({ stream, headers: corsHeaders });
});
