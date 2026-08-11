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
  type ResolveResult,
} from "../_shared/taxonomy-resolver.ts";
import { detectViewIntent, withinPointRadius, hasVantage, hasPointViewProof, hasPanoramaAttribute, hasPanoramaProof } from "../_shared/ai-engine/view-targets.ts";
import { pickLang, normalize, toMapMarker, fetchPriorFull } from "../_shared/ai-engine/routes/shared.ts";
import { loadEditorialBundle, formatEditorialBundle } from "../_shared/ai-engine/editorial.ts";
import { isWeatherIntent } from "../_shared/ai-engine/routes/weather.ts";
import {
  loadCuratedTargets, fetchBlogPostsCached, matchBlogArticle, matchCuratedByText,
  buildBlogArticleAnswer, buildPinnedAnswer, buildFilteredAnswer,
} from "../_shared/ai-engine/routes/curated.ts";
import { isHoursIntent, buildHoursAnswer, buildHoursForBusinesses } from "../_shared/ai-engine/routes/opening.ts";
import { isBookingIntent, buildBookingAnswer, buildBookingForBusinesses } from "../_shared/ai-engine/routes/booking.ts";
import {
  isNearbyOverviewIntent, isProximityIntent, buildNearbyOverview, buildDisclosureFromCounts,
} from "../_shared/ai-engine/routes/nearby.ts";
import {
  isRatingRankingIntent, isDistanceListIntent, isCountIntent, parseOrdinalIntent,
  extractPriorOrderedBusinesses, buildRatingRanking, buildDistanceList, buildOrdinalPick,
  buildCountAnswer,
} from "../_shared/ai-engine/routes/ranking.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SURFACE_LOG = "embed_v2";
const CFG = getSurfaceConfig("embed");

type AiClass = "A" | "B" | "C";
type Lang = "fr" | "en" | "ar";

const HOST_FIELDS =
  "id, slug, name, city, neighborhood, address, main_category, categories, hook_fr, hook_en, hook_ar, " +
  "description, description_en, description_ar, min_price, manual_price_range, phone, whatsapp, website, " +
  "opening_hours, show_opening_hours, reserve_now_url, reserve_now_cta, presentation_mode, online_shop_url, " +
  "online_shop_cta, online_shop_presentation_mode, url_4, url_4_cta, url_4_presentation_mode, url_5, " +
  "url_5_cta, url_5_presentation_mode, latitude, longitude, is_active";

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
  const lang = pickLang(body.language) as Lang;
  const sessionId: string | null = typeof body.sessionId === "string" ? body.sessionId : null;
  let suggestionId: string | null = typeof body.suggestionId === "string" && body.suggestionId ? body.suggestionId : null;
  /** true quand la suggestion a été retrouvée depuis le texte libre (pas un clic). */
  let suggestionFromText = false;
  const followupId: string | null = typeof body.followupId === "string" && body.followupId ? body.followupId : null;

  if (!slugOrId) {
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
      try {
        resolution = await resolveWithAdmin(admin, userMessage);
        resolutionLog = resolutionMetric(resolution);
      } catch (e) {
        console.warn("[embed-ai-chat-v2] resolver failed", String(e));
      }


      const finish = async (streamCompleted: boolean) => {
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
        // ── Hôte ────────────────────────────────────────────────────────────
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
        const host = hostRows[0];
        cityDetected = host.city || null;

        // ── Classe A — routes déterministes (zéro token) ────────────────────
        // 1. Météo
        if (isWeatherIntent(userMessage)) {
          route = "weather";
          const city = host.city || "Marrakech";
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

        // 2. Horaires
        if (isHoursIntent(userMessage)) {
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
        if (isBookingIntent(userMessage)) {
          route = "booking";
          const answer = priorIds.length
            ? await buildBookingForBusinesses(admin, priorIds.slice(0, CFG.maxResults), lang)
            : buildBookingAnswer(host, lang);
          if (answer) {
            resultsCount = priorIds.length ? Math.min(priorIds.length, CFG.maxResults) : 1;
            emit(answer);
            await finish(true);
            return;
          }
          fallbackReason = "no_results";
        }

        // 3bis. AUTORITÉ CURATÉE (zéro token) — une suggestion/relance pointant vers
        // un article de blog ou des établissements épinglés fait loi : ni le
        // classifieur ni le résolveur taxonomique ne peuvent la remplacer ou la
        // « compléter » avec des résultats de recherche.
        // Texte libre : on rapproche d'abord la phrase tapée d'un libellé de
        // suggestion staff (matcher partagé) → taper la phrase == cliquer la suggestion.
        if (!suggestionId && !followupId) {
          const m = await matchCuratedByText(admin, { text: userMessage, surface: "embed", crossSurface: true })
            .catch(() => null);
          if (m) {
            suggestionId = m.id;
            suggestionFromText = true;
            console.log("[embed-ai-chat-v2] curated_text_match", JSON.stringify(m));
          }
        }
        if (suggestionId || followupId) {
          const curated = await loadCuratedTargets(admin, {
            suggestionId, followupId, businessId: host.id,
          }).catch((e) => {
            console.error("[embed-ai-chat-v2] curated_lookup_failed", String(e));
            return null;
          });
          // Le clic initial (message == libellé) ou une relance explicite gardent la cible.
          const norm = (s: string) => normalize(s).replace(/[?!.\s]+$/g, "").trim();
          const isInitialClick = !!(curated?.label && norm(userMessage) === norm(curated.label));
          const keepCurated = !!curated && (!!followupId || isInitialClick || suggestionFromText || !priorIds.length);

          if (curated && keepCurated && curated.blogPostIds.length) {
            const posts = await fetchBlogPostsCached(admin).catch(() => []);
            const post = curated.blogPostIds.map((id) => posts.find((p) => p.id === id)).filter(Boolean)[0];
            if (post) {
              const built = await buildBlogArticleAnswer(admin, post, host, lang).catch((e) => {
                console.error("[embed-ai-chat-v2] blog_route_failed", String(e));
                return null;
              });
              if (built) {
                route = built.route;
                resultsCount = built.shown;
                emit(built.text);
                if (built.mapPayload?.businesses?.length) {
                  emit(`\n\n<!--SHOW_ON_MAP:${JSON.stringify(built.mapPayload)}-->`);
                }
                if (built.knownBusinesses.length) {
                  emit(`\n\n<!--KNOWN_BUSINESSES:${JSON.stringify(built.knownBusinesses)}-->`);
                }
                await finish(true);
                return;
              }
              fallbackReason = "route_failed";
            }
          }

          if (curated && keepCurated && curated.pinnedBusinessIds.length) {
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
              await finish(true);
              return;
            }
            fallbackReason = "no_results";
          }

          // Filtre déterministe curaté : commodités / badges / sous-catégories liés
          // à la suggestion en backoffice → filtre DUR (engagements ou business-search),
          // parité V1. Aucun classifieur, aucun générateur.
          if (curated && keepCurated && (curated.commodities.length || curated.badgeIds.length || curated.subcategoryNames.length)) {
            const built = await buildFilteredAnswer(admin, host, lang, {
              badgeIds: curated.badgeIds,
              subcategoryNames: curated.subcategoryNames,
              commodities: curated.commodities,
              label: curated.label,

              city: host.city,
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
              await finish(true);
              return;
            }
            fallbackReason = "no_results";
          }
        }



        // 4. Rappels sur les résultats déjà affichés (comptage, ordinal, classement)
        if (priorIds.length) {
          const prior = extractPriorOrderedBusinesses(uiMessages as any[], host.id);
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
          if (isDistanceListIntent(userMessage)) {
            route = "nearby";
            const answer = await buildDistanceList(admin, host, priorIds, lang);
            if (answer) {
              resultsCount = priorIds.length;
              emit(answer);
              await finish(true);
              return;
            }
          }
        }

        // 5. Panorama « que faire à proximité ? » (déterministe, Structure du Front)
        // Autorité du résolveur : si la requête contient une cible taxonomique réelle
        // (« piscine à proximité »), ce n'est plus un panorama générique → recherche ciblée.
        const hasResolvedIntent = !!resolution && resolution.targets.some(
          (t) => t.type === "category" || t.type === "subcategory" || t.type === "service" || t.type === "badge",
        );
        if (
          (isNearbyOverviewIntent(userMessage, host.name) && !hasResolvedIntent) ||
          (isProximityIntent(userMessage) && !suggestionId && !hasResolvedIntent)
        ) {
          route = "nearby";
          const hostCategoryNames = new Set<string>(
            [...(Array.isArray(host.categories) ? host.categories : []), host.main_category]
              .map(normalize).filter(Boolean),
          );
          const overview = await buildNearbyOverview(admin, host, hostCategoryNames, lang).catch((e) => {
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

        // 6. Article de blog détecté en texte libre (titre publié) — même rendu
        // éditorial que la route curatée, corpus clos.
        if (userMessage.trim().length >= 6) {
          const posts = await fetchBlogPostsCached(admin).catch(() => []);
          const match = matchBlogArticle(userMessage, lang, posts, host.id, host.name);
          if (match) {
            const built = await buildBlogArticleAnswer(admin, match, host, lang).catch((e) => {
              console.error("[embed-ai-chat-v2] blog_freetext_failed", String(e));
              return null;
            });
            if (built && built.shown >= 3) {
              route = built.route;
              resultsCount = built.shown;
              emit(built.text);
              if (built.mapPayload?.businesses?.length) {
                emit(`\n\n<!--SHOW_ON_MAP:${JSON.stringify(built.mapPayload)}-->`);
              }
              emit(`\n\n<!--KNOWN_BUSINESSES:${JSON.stringify(built.knownBusinesses)}-->`);
              await finish(true);
              return;
            }
          }
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
            surface: "embed",
            focus: {
              last_business_ids: priorIds.length ? priorIds.slice(0, 3) : [host.id],
              last_business_names: priorNames.length ? priorNames : [host.name],
              last_route: priorRoute as any,
              last_category: priorCategory,
              active_city: host.city || null,
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

        if (out && confident && out.intent === "business_qa" && !priorIds.length) {
          // Question sur l'hôte : contexte hôte seul, synthèse générative courte.
          route = "business_qa";
        }

        let results: any[] = [];
        let totalFound = 0;

        // Recherche déterministe partagée : appelée avec les champs structurés du
        // classifieur, ou en secours avec le message brut quand il n'est pas confiant.
        const runSearch = async (baseQuery: string, city: string, excluded: string[]) => {
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
              if (b.id === host.id) return false;
              if (!excluded.length) return true;
              const hay = normalize(`${b.main_category || ""} ${(b.categories || []).join(" ")}`);
              return !excluded.some((x) => hay.includes(x));
            });

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
                  !isExcluded(t.value),
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
              .filter((t) => t.type === "service" && t.strength === "expansion" && !isExcluded(t.value))
              .map((t) => t.value)
              .slice(0, 2)
          : [];
        const resolvedCity = resolution
          ? (strongTargetsOfType(resolution, "city")[0] ?? targetsOfType(resolution, "city")[0] ?? null)
          : null;

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
        const contextualFollowUp =
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


        if (!contextualFollowUp && out && confident && (out.intent === "search" || out.intent === "compare")) {
          const views = detectViewIntent(userMessage);
          const panoramaHints = views.panoramas.map((p) => p.attributeNames[0]);
          const excluded = excludedTerms;
          const excludesLodging = excluded.some((x) => /hotel|riad|hebergement|maison\s?d/.test(x));
          // Un repère ponctuel (Koutoubia) se traite par rayon + preuve de point de
          // vue, pas par mot-clé : n'injecter aucun indice « rooftop » ici.
          const hintParts = views.points.length && !excludesLodging ? [] : panoramaHints;
          const coreTerms = strongTerms.length
            ? strongTerms
            : classifierCategoryValid
              ? [validatedCategory as string]
              : expansionTerms.length
                ? expansionTerms
                : [priorCategory].filter(Boolean) as string[];
          const baseQuery = [...coreTerms, ...hintParts].filter(Boolean).join(" ").slice(0, 200)
            || userMessage.slice(0, 200);
          await runSearch(baseQuery, resolvedCity || out.city || host.city || "Marrakech", excluded);
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
            resolvedCity || out?.city || host.city || "Marrakech",
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

        // Corpus de la relance contextuelle : les fiches déjà présentées.
        const priorFull = (contextualFollowUp || (priorIds.length && !results.length))
          ? await fetchPriorFull(admin, priorIds.slice(0, 6)).catch(() => [])
          : [];

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
          hostContext(host, lang),
          results.length
            ? `Résultats trouvés (${results.length} sur ${totalFound}) — ce sont les seules adresses à présenter, présente-les toutes :\n${resultsContext(results, lang)}`
            : "",
          editorialCtx
            ? `CONTEXTE ÉDITORIAL ([DESCRIPTION] description de l'établissement, [HOOK] accroche, [IMAGE POPUP] titres et textes des photos, [SERVICE] services, [OFFRE] offres et promotions, [TXT IA] textes rédigés par l'établissement/affilié ; intègre-les naturellement, ne mets pas en avant un établissement uniquement parce qu'il a du contenu ici) :\n${editorialCtx}`
            : "",
          !results.length && priorFull.length
            ? `${contextualFollowUp ? "RELANCE CONTEXTUELLE — la question porte sur ce qui a déjà été présenté ci-dessous. Ne propose AUCUNE autre adresse et ne lance aucune nouvelle sélection.\n" : ""}Établissements déjà présentés dans la conversation :\n${resultsContext(priorFull as any[], lang)}`
            : "",
        ].filter(Boolean).join("\n\n");

        const system = `Tu es le concierge IA de ${host.name}. Ton: ${CFG.ton}.
Tu ne t'appuies QUE sur le contexte fourni. N'invente jamais un établissement, un prix, un horaire ou un avis.
Quand le contexte contient des résultats, tu les présentes TOUJOURS, même s'ils ne correspondent pas exactement à la demande : dans ce cas, une phrase d'introduction honnête ("pas de correspondance exacte, voici une sélection proche") puis les adresses. Ne réponds jamais que tu n'as rien trouvé alors que des résultats sont fournis.
Si le contexte ne contient aucun résultat, dis-le en une phrase et propose une reformulation.
Termine TOUJOURS par une seule question de relance courte, ancrée uniquement dans le contexte fourni (une précision, une alternative ou une étape suivante concrète : réserver, horaires, proximité). Deux options maximum dans la question, jamais d'invention.

Réponds en ${lang === "en" ? "anglais" : lang === "ar" ? "arabe" : "français"}, 120 mots maximum (relance incluse), sans liste brute si tu peux faire des phrases.`;

        const history = uiMessages
          .filter((m: any) => m?.role === "user" || m?.role === "assistant")
          .slice(-CFG.historyTurns * 2)
          .map((m: any) => ({
            role: m.role as "user" | "assistant",
            content: textOf(m).replace(/<!--[\s\S]*?-->/g, "").slice(0, 2000),
          }))
          .filter((m) => m.content.trim());

        let finalText = "";
        try {
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
          const disclosure = totalFound > results.length
            ? `\n\n${buildDisclosureFromCounts(results.length, totalFound, cityDetected || host.city || "")}`
            : "";
          if (disclosure && !/sur\s+\d+\s+trouv/i.test(finalText)) emit(disclosure);
          emit(`\n\n${toMapMarker(results, null)}`);
          emit(`\n\n<!--KNOWN_BUSINESSES:${JSON.stringify(results.map((b) => ({ id: b.id, name: b.name })))}-->`);
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
