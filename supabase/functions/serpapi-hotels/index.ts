import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { assertAllowedOrigin } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SERPAPI_BASE = "https://serpapi.com/search.json";

interface SerpApiRequest {
  cityName: string;
  checkIn: string;
  checkOut: string;
  adults?: number;
  currency?: string;
  language?: string;
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  maxPages?: number;
  skipCache?: boolean; // bypass cache for debugging / forced refresh
}

function normalizeCityKey(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapProperty(p: Record<string, unknown>, idx: number, currency: string) {
  const prices = p.rate_per_night as Record<string, unknown> | undefined;
  const totalPrice = p.total_rate as Record<string, unknown> | undefined;
  const gps = p.gps_coordinates as Record<string, number> | undefined;
  const overallRating = p.overall_rating as number | undefined;
  const reviews = p.reviews as number | undefined;
  const images = (p.images as { thumbnail?: string; original_image?: string }[]) || [];
  const nearbyPlaces = p.nearby_places as Record<string, unknown>[] | undefined;

  return {
    position: idx + 1,
    name: p.name || "Unknown",
    type: p.type || null,
    hotelClass: p.hotel_class || null,
    description: p.description || null,
    link: p.link || null,
    ratePerNight: prices ? {
      amount: (prices.lowest as string) || (prices.extracted_lowest as string) || null,
      currency,
    } : null,
    totalRate: totalPrice ? {
      amount: (totalPrice.lowest as string) || (totalPrice.extracted_lowest as string) || null,
      currency,
    } : null,
    priceBeforeDiscount: prices?.before_taxes_fees || null,
    dealDescription: p.deal_description || p.deal || null,
    checkIn: p.check_in_time || null,
    checkOut: p.check_out_time || null,
    overallRating: overallRating || null,
    reviewCount: reviews || null,
    locationRating: (p.location_rating as number) || null,
    amenities: (p.amenities as string[]) || [],
    latitude: gps?.latitude || null,
    longitude: gps?.longitude || null,
    images: images.slice(0, 10).map(img => img.original_image || img.thumbnail).filter(Boolean),
    thumbnail: (p.images as { thumbnail?: string }[])?.[0]?.thumbnail || null,
    nearbyPlaces: nearbyPlaces || [],
    serpApiPropertyId: p.property_token || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const originBlock = assertAllowedOrigin(req, corsHeaders);
  if (originBlock) return originBlock;


  try {
    const apiKey = Deno.env.get("SERPAPI_API_KEY");
    if (!apiKey) throw new Error("SERPAPI_API_KEY not configured");

    const params: SerpApiRequest = await req.json();
    if (!params.cityName) throw new Error("cityName is required");
    if (!params.checkIn) throw new Error("checkIn is required");
    if (!params.checkOut) throw new Error("checkOut is required");

    const currency = params.currency || "EUR";
    const language = params.language || "fr";
    const country = params.country || "ma";
    const adults = params.adults || 2;
    const cityKey = normalizeCityKey(params.cityName);

    // Supabase admin client (service role) for cache read/write
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Only cache "broad" queries (no price/rating filters) so cache stays reusable
    const isCacheable =
      !params.skipCache &&
      !params.minPrice &&
      !params.maxPrice &&
      !params.rating;

    const requestedMaxPages = Math.min(params.maxPages || 10, 10);

    // Mappings OWM de la ville : sert (a) à l'arrêt anticipé de la pagination
    // dès que tous les établissements connus pour renvoyer un tarif ont été vus,
    // (b) à la mise à jour automatique du flag `has_serp_price`.
    const normName = (v: unknown) =>
      typeof v === "string"
        ? v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
        : "";

    const { data: mappingRows } = await supabase
      .from("hotel_mappings")
      .select("id, serp_hotel_name, city, has_serp_price, serp_property_token")
      .not("business_id", "is", null);

    const cityMappings = (mappingRows || []).filter(
      (m: Record<string, unknown>) => normalizeCityKey(String(m.city || "")) === cityKey && normName(m.serp_hotel_name),
    );
    const mappedNames = new Set(cityMappings.map((m) => normName((m as Record<string, unknown>).serp_hotel_name)));
    const unknownCount = cityMappings.filter(
      (m: Record<string, unknown>) => m.has_serp_price === null || m.has_serp_price === undefined,
    ).length;
    // Règle (a) « complet » : seulement si la ville est entièrement qualifiée
    // (aucun mapping jamais vérifié), sinon on risquerait de s'arrêter avant
    // d'avoir découvert un établissement inconnu.
    const pricedNames =
      unknownCount === 0
        ? new Set(
            cityMappings
              .filter((m: Record<string, unknown>) => m.has_serp_price === true)
              .map((m) => normName((m as Record<string, unknown>).serp_hotel_name)),
          )
        : new Set<string>();
    // Quand des identifiants Google manquent encore, la pagination doit aller au
    // bout : elle sert précisément à les découvrir (un seul balayage par ville).
    const missingTokens = cityMappings.some((m: Record<string, unknown>) => !m.serp_property_token);
    const earlyStopEnabled =
      mappedNames.size > 0 && !missingTokens && !params.minPrice && !params.maxPrice && !params.rating;

    // 1) Try cache. A cache generated with fewer pages must never satisfy a
    // deeper request: otherwise mapped hotels located later in Google results
    // disappear until cache expiry.
    if (isCacheable) {
      const { data: cached } = await supabase
        .from("serpapi_hotels_cache")
        .select("payload, hotel_count, fetched_at, expires_at")
        .eq("city_key", cityKey)
        .eq("check_in", params.checkIn)
        .eq("check_out", params.checkOut)
        .eq("adults", adults)
        .eq("currency", currency)
        .eq("language", language)
        .eq("country", country)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      const cachedPages = Number((cached?.payload as Record<string, unknown> | null)?.pages || 0);
      const cachedPayload = cached?.payload as Record<string, unknown> | null;
      const cachedExhausted = cachedPayload?.exhausted === true || cachedPayload?.earlyStop === true;
      if (cached?.payload && (cachedExhausted || cachedPages >= requestedMaxPages)) {
        console.log(`SerpApi cache HIT: ${cityKey} ${params.checkIn}→${params.checkOut} (${cached.hotel_count} hotels)`);
        return new Response(
          JSON.stringify({
            ...cached.payload,
            cached: true,
            fetchedAt: cached.fetched_at,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`SerpApi cache MISS: ${cityKey} ${params.checkIn}→${params.checkOut} (requested=${requestedMaxPages}, cached=${cachedPages})`);
    }

    // 2) Cache miss → call SerpAPI
    const maxPages = requestedMaxPages;
    const allProperties: ReturnType<typeof mapProperty>[] = [];
    let brands: unknown[] = [];
    let nextPageToken: string | null = null;
    let page = 0;
    let exhausted = false;
    let earlyStop = false;
    // Suivi de la couverture des mappings OWM pour l'arrêt anticipé.
    const EMPTY_PAGES_STOP = 3;
    const MIN_PAGES_BEFORE_STOP = 5;
    const foundMapped = new Set<string>();
    let lastMappedCount = 0;
    let lastMappedPage = 0;

    /* ── Mode ciblé (source de vérité) ───────────────────────────────────────
       On n'interroge QUE les hôtels mappés : une requête par établissement, par
       son identifiant Google (`property_token`), toutes lancées en parallèle —
       au lieu de paginer toute la ville en série (11 pages ≈ 49 s). Les hôtels
       non mappés ne sont pas exploités par le produit, donc jamais demandés.
       La pagination ville ne sert plus qu'à découvrir les identifiants manquants
       (elle les enregistre ensuite) ou quand la requête porte des filtres. */
    const tokenMappings = cityMappings.filter((m: Record<string, unknown>) => !!m.serp_property_token);
    const noFilters = !params.minPrice && !params.maxPrice && !params.rating;
    const targeted = noFilters && tokenMappings.length > 0 && tokenMappings.length === cityMappings.length;

    if (targeted) {
      const CONCURRENCY = 32;
      console.log(`SerpApi mode ciblé ${cityKey}: ${tokenMappings.length} hôtel(s) mappé(s) interrogé(s) en parallèle`);

      const fetchByToken = async (m: Record<string, unknown>) => {
        const sp = new URLSearchParams({
          engine: "google_hotels",
          q: params.cityName,
          property_token: String(m.serp_property_token),
          check_in_date: params.checkIn,
          check_out_date: params.checkOut,
          adults: String(adults),
          currency,
          hl: language,
          gl: country,
          api_key: apiKey,
        });
        try {
          const res = await fetch(`${SERPAPI_BASE}?${sp}`);
          const body = await res.json();
          if (!res.ok || body.error) {
            console.warn(`SerpApi ciblé "${m.serp_hotel_name}": ${body?.error || res.status}`);
            return null;
          }
          // Réponse « fiche hôtel » : les tarifs sont à la racine. Le nom retenu
          // est celui du mapping pour que la correspondance côté client (nom
          // exact du mapping) reste inchangée.
          return { ...(body as Record<string, unknown>), name: m.serp_hotel_name };
        } catch (e) {
          console.warn(`SerpApi ciblé "${m.serp_hotel_name}" échec réseau:`, e instanceof Error ? e.message : e);
          return null;
        }
      };

      for (let i = 0; i < tokenMappings.length; i += CONCURRENCY) {
        const slice = tokenMappings.slice(i, i + CONCURRENCY);
        const results = await Promise.all(slice.map((m) => fetchByToken(m as Record<string, unknown>)));
        for (const hit of results) {
          if (!hit) continue;
          allProperties.push(mapProperty(hit, allProperties.length, currency));
        }
      }

      exhausted = true;
      console.log(`SerpApi mode ciblé ${cityKey}: ${allProperties.length}/${tokenMappings.length} hôtel(s) trouvé(s)`);
    } else if (noFilters && cityMappings.length > 0) {
      console.log(
        `SerpApi ${cityKey}: pagination ville (identifiants manquants sur ${cityMappings.length - tokenMappings.length}/${cityMappings.length} mapping(s))`,
      );
    }

    while (!targeted && page < maxPages) {
      const searchParams = new URLSearchParams({
        engine: "google_hotels",
        q: `Hotels in ${params.cityName}`,
        check_in_date: params.checkIn,
        check_out_date: params.checkOut,
        adults: String(adults),
        currency,
        hl: language,
        gl: country,
        api_key: apiKey,
      });

      if (nextPageToken) searchParams.set("next_page_token", nextPageToken);
      if (params.minPrice) searchParams.set("min_price", String(params.minPrice));
      if (params.maxPrice) searchParams.set("max_price", String(params.maxPrice));
      if (params.rating) searchParams.set("rating", String(params.rating));

      const url = `${SERPAPI_BASE}?${searchParams}`;
      console.log(`SerpApi page ${page + 1} request:`, url.replace(apiKey, "***"));

      const res = await fetch(url);
      const body = await res.json();

      if (!res.ok || body.error) {
        console.error("SerpApi error:", JSON.stringify(body).slice(0, 1000));
        throw new Error(body.error || `SerpApi error [${res.status}]`);
      }

      const pageProperties = (body.properties || []).map(
        (p: Record<string, unknown>, idx: number) => mapProperty(p, allProperties.length + idx, currency)
      );
      const seen = new Set(allProperties.map(h => (h.name as string).toLowerCase().trim()));
      for (const h of pageProperties) {
        const key = (h.name as string).toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          allProperties.push(h);
        }
      }

      if (page === 0) brands = body.brands || [];

      // Arrêt anticipé (deux déclencheurs, jamais sur une requête filtrée) :
      //  a) tous les établissements OWM connus pour renvoyer un tarif sont vus ;
      //  b) EMPTY_PAGES_STOP pages consécutives sans aucun nouvel établissement
      //     mappé : continuer ne fait que payer de la latence.
      if (earlyStopEnabled) {
        const collected = new Set(allProperties.map((h) => normName(h.name)));
        for (const n of mappedNames) if (collected.has(n)) foundMapped.add(n);
        console.log(
          `SerpApi coverage ${cityKey} p${page + 1}: mapped=${mappedNames.size} found=${foundMapped.size} lastMappedPage=${lastMappedPage + 1} priced=${pricedNames.size}`,
        );
        if (foundMapped.size > lastMappedCount) {
          lastMappedCount = foundMapped.size;
          lastMappedPage = page;
        }
        if (pricedNames.size > 0 && [...pricedNames].every((n) => collected.has(n))) {
          earlyStop = true;
          console.log(`SerpApi early stop (complet): ${cityKey} après ${page + 1} page(s), ${pricedNames.size} mapping(s) tarifés`);
          break;
        }
        if (page - lastMappedPage >= EMPTY_PAGES_STOP && page + 1 >= MIN_PAGES_BEFORE_STOP) {
          earlyStop = true;
          console.log(`SerpApi early stop (plateau): ${cityKey} après ${page + 1} page(s), ${foundMapped.size} mapping(s) trouvés`);
          break;
        }
      }


      const pagination = body.serpapi_pagination;
      if (pagination?.next_page_token) {
        nextPageToken = pagination.next_page_token;
        page++;
      } else {
        exhausted = true;
        break;
      }
    }

    console.log(`SerpApi: ${allProperties.length} hotels found for ${params.cityName} (${page + 1} page(s))`);

    // 2b) Maintenance automatique de `has_serp_price` : on passe à "true" tout
    // mapping vu avec un tarif ; on ne passe à "false" qu'après un balayage
    // complet (sinon on marquerait "sans tarif" des mappings jamais lus).
    if (!params.minPrice && !params.maxPrice && !params.rating && cityMappings.length > 0 && allProperties.length > 0) {
      // Mémorisation de l'identifiant Google de chaque hôtel mappé : dès qu'il
      // est connu, la ville n'est plus paginée (mode ciblé, ~5 s).
      if (!targeted) {
        const tokenByName = new Map<string, string>();
        for (const h of allProperties) {
          const n = normName(h.name);
          const tok = h.serpApiPropertyId;
          if (n && typeof tok === "string" && tok) tokenByName.set(n, tok);
        }
        for (const m of cityMappings) {
          const row = m as Record<string, unknown>;
          const tok = tokenByName.get(normName(row.serp_hotel_name));
          if (!tok || row.serp_property_token === tok) continue;
          supabase
            .from("hotel_mappings")
            .update({ serp_property_token: tok })
            .eq("id", String(row.id))
            .then(({ error }) => {
              if (error) console.error(`Token update failed (${row.serp_hotel_name}):`, error.message);
            });
        }
        console.log(`SerpApi identifiants mémorisés ${cityKey}: ${tokenByName.size} hôtel(s) vus`);
      }
      const priceByName = new Map<string, boolean>();
      for (const h of allProperties) {
        const n = normName(h.name);
        if (!n) continue;
        const raw = h.ratePerNight?.amount;
        const num = parseFloat(String(raw ?? "").replace(/[^\d.]/g, ""));
        priceByName.set(n, Number.isFinite(num) && num > 0);
      }
      const withPrice: string[] = [];
      const withoutPrice: string[] = [];
      for (const m of cityMappings) {
        const n = normName((m as Record<string, unknown>).serp_hotel_name);
        (priceByName.get(n) === true ? withPrice : withoutPrice).push(String((m as Record<string, unknown>).id));
      }
      const checkedAt = new Date().toISOString();
      const applyFlag = (ids: string[], value: boolean) =>
        ids.length === 0
          ? Promise.resolve()
          : supabase
              .from("hotel_mappings")
              .update({ has_serp_price: value, serp_price_checked_at: checkedAt })
              .in("id", ids)
              .then(({ error }) => {
                if (error) console.error(`Flag update (${value}) failed:`, error.message);
              });
      Promise.all([applyFlag(withPrice, true), earlyStop ? Promise.resolve() : applyFlag(withoutPrice, false)]).then(() =>
        console.log(
          `has_serp_price maj ${cityKey}: ${withPrice.length} avec tarif${earlyStop ? " (arrêt anticipé, aucun passage à false)" : ` / ${withoutPrice.length} sans`}`,
        ),
      );
    }

    const responsePayload = {
      data: allProperties,
      count: allProperties.length,
      pages: page + 1,
      exhausted,
      earlyStop,
      brands,
      searchInfo: {
        query: `Hotels in ${params.cityName}`,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
      },
    };

    // 3) Write to cache (fire-and-forget; never block response on cache write)
    if (isCacheable && allProperties.length > 0) {
      supabase
        .from("serpapi_hotels_cache")
        .upsert(
          {
            city_key: cityKey,
            check_in: params.checkIn,
            check_out: params.checkOut,
            adults,
            currency,
            language,
            country,
            payload: responsePayload,
            hotel_count: allProperties.length,
            fetched_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
          },
          { onConflict: "city_key,check_in,check_out,adults,currency,language,country" }
        )
        .then(({ error }) => {
          if (error) console.error("Cache write failed:", error.message);
          else console.log(`SerpApi cache WRITE: ${cityKey} ${params.checkIn}→${params.checkOut}`);
        });
    }

    return new Response(
      JSON.stringify({ ...responsePayload, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
