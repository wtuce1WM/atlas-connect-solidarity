import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { assertStaffOrAffiliateBusiness } from "../_shared/auth-helpers.ts";
import { fetchAiGateway, resolveCallerContext } from "../_shared/ai-gateway.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

// Templates Remotion disponibles, choisis par l'IA.
// business-showcase = template générique piloté par props (fallback universel).
const TEMPLATES = [
  { id: "business-showcase", scope: "générique", description: "Fallback universel pour tout établissement. Piloté par props (name, hook, tagline, city, images[], offer)." },
  { id: "comptoir-darna", scope: "Comptoir Darna (Marrakech)", description: "Restaurant emblématique, ambiance orientale festive." },
  { id: "riad-dar-najat", scope: "Riad Dar Najat (Marrakech)", description: "Riad d'exception, médina." },
  { id: "maison-brummell", scope: "Maison Brummell (Marrakech)", description: "Boutique-hôtel design contemporain." },
  { id: "jnane-rumi", scope: "Jnane Rumi (Marrakech)", description: "Maison d'hôtes raffinée, jardin." },
  { id: "nar-complexe", scope: "N.A.R Complexe (Marrakech)", description: "Complexe lifestyle, beach club." },
  { id: "farasha-farmhouse", scope: "Farasha Farmhouse (Marrakech)", description: "Farmhouse luxe campagne marrakchie." },
  { id: "bo-zin", scope: "Bô Zin (Marrakech)", description: "Restaurant lounge route de l'Ourika." },
  { id: "corporate-vertical", scope: "1WM corporate", description: "Vidéo institutionnelle One World Morocco (modèle économique, villes pionnières, paliers). À utiliser UNIQUEMENT pour des contenus corporate 1WM." },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { prompt, business_id, duration_sec = 30, tone = "immersif", parent_job_id, options, preview_only = false } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0 || prompt.length > 8000) {
      return json({ error: "prompt invalide" }, 400);
    }
    if (![15, 30, 45, 60].includes(Number(duration_sec))) {
      return json({ error: "duration_sec doit être 15, 30, 45 ou 60" }, 400);
    }

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Charger un éventuel job parent pour affinage (avant l'auth pour hériter de son business_id)
    let parentJob: any = null;
    if (parent_job_id && typeof parent_job_id === "string") {
      const { data } = await supa
        .from("video_jobs")
        .select("id,prompt,template_id,template_props,business_id,duration_sec,tone")
        .eq("id", parent_job_id)
        .maybeSingle();
      if (data) parentJob = data;
    }

    // Auth: staff full access, otherwise must own the business_id (résolu depuis parent si besoin)
    const authBusinessId = business_id ?? parentJob?.business_id ?? "";
    const auth = await assertStaffOrAffiliateBusiness(req, corsHeaders, authBusinessId);
    if (auth instanceof Response) return auth;
    const callerUserId = auth.userId;
    const callerContext = await resolveCallerContext(supa, callerUserId);


    // Charger le contexte établissement (par id, ou par nom détecté dans le prompt, ou hérité du parent)
    let businessContext: any = null;
    let resolved_business_id: string | null = business_id ?? parentJob?.business_id ?? null;

    // Si pas de business_id fourni, essayer de détecter un nom d'établissement dans le prompt.
    if (!resolved_business_id) {
      const quoteMatch = prompt.match(/[«"']([^»"']{3,80})[»"']/);
      const candidate = quoteMatch?.[1]?.trim();
      if (candidate) {
        const { data: matches } = await supa
          .from("businesses")
          .select("id,name")
          .ilike("name", `%${candidate}%`)
          .eq("is_active", true)
          .limit(1);
        if (matches && matches[0]) resolved_business_id = matches[0].id;
      }
    }

    if (resolved_business_id) {
      const { data: biz } = await supa
        .from("businesses")
        .select("id,name,slug,hook_fr,destination_hook,poi_hook,description,city,neighborhood,main_category,categories,opening_hours,latitude,longitude,address,computed_rating,google_rating,total_review_count,google_review_count,google_review_url,tripadvisor_rating,tripadvisor_review_count,tripadvisor_url,restaurant_guru_rating,restaurant_guru_review_count,restaurant_guru_url,images,popup_image_url")
        .eq("id", resolved_business_id)
        .maybeSingle();

      const { data: docs } = await supa
        .from("business_documents")
        .select("type,url,name,description,thumbnail_url,sort_order,price,popup")
        .eq("business_id", resolved_business_id)
        .in("type", ["image", "video", "internal-video", "promotion"])
        .order("sort_order", { ascending: true })
        .limit(20);

      const mergedMedias: any[] = [];
      if (biz?.popup_image_url) mergedMedias.push({ type: "image", url: biz.popup_image_url, name: "Image principale" });
      if (Array.isArray(biz?.images)) {
        for (const url of biz.images) mergedMedias.push({ type: "image", url });
      }
      if (docs) mergedMedias.push(...docs);

      businessContext = {
        ...biz,
        hook: biz?.hook_fr ?? biz?.destination_hook ?? biz?.poi_hook ?? biz?.description ?? null,
        medias: mergedMedias,
      };
    }

    const stripHtml = (value: unknown): string | null => {
      if (typeof value !== "string") return null;
      return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || null;
    };

    const cleanDisplayText = (value: unknown): string | null => {
      if (typeof value !== "string") return null;
      return value
        .replace(/\bterracotta(?:é|e|s)?\b/gi, "")
        .replace(/\s+([,.:;!?])/g, "$1")
        .replace(/\s{2,}/g, " ")
        .replace(/^[\s,.:;!?-]+|[\s,.:;!?-]+$/g, "")
        .trim() || null;
    };

    const deriveTaglineFromHook = (hook: string | null, name?: string | null): string => {
      const fallback = name ? `L'expérience ${name}` : "Une adresse à découvrir";
      const cleanedHook = cleanDisplayText(stripHtml(hook) ?? "");
      if (!cleanedHook) return fallback;
      const afterColon = cleanedHook.includes(":") ? cleanedHook.split(":").pop()?.trim() : cleanedHook;
      let candidate = afterColon || cleanedHook;
      if (name) {
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        candidate = candidate.replace(new RegExp(`\\b(au|à|chez|pour)?\\s*${escapedName}\\b`, "gi"), "");
      }
      candidate = cleanDisplayText(candidate) || cleanedHook;
      const words = candidate.split(/\s+/).filter(Boolean);
      return words.slice(0, 6).join(" ").replace(/^[a-zàâäéèêëîïôöùûüç]/, (c) => c.toUpperCase());
    };

    const hasInjectablePopup = (context: any): boolean => {
      if (!context) return false;
      if (context.popup_image_url) return true;
      return Array.isArray(context.medias) && context.medias.some((m: any) => Boolean(m?.popup));
    };

    const promptText = prompt.toLowerCase();
    const wantsReviews = Boolean(options?.reviews) || /avis client|badge des avis|note\/20|nombre d'avis|compteur d'avis/i.test(promptText);
    const wantsHours = Boolean(options?.hours) || /horaires|heures d'ouverture|ouverture de l'établissement/i.test(promptText);
    const wantsMapMarker = Boolean(options?.map_marker) || /google\s*map|marqueur de l'établissement|marqueur.*carte|localisation/i.test(promptText);
    const wantsDigitalId = Boolean(options?.digital_id) || /id numérique|fiche.*qr|qr code/i.test(promptText);
    const wantsGoogleReviews = Boolean(options?.google_reviews);
    const wantsTripAdvisor = Boolean(options?.tripadvisor);
    const wantsRestaurantGuru = Boolean(options?.restaurant_guru);
    const wantsCustomerReview = Boolean(options?.customer_review);
    const customerReviewId = typeof options?.customer_review_id === "string" ? options.customer_review_id : null;
    const customerReviewHighlight = typeof options?.customer_review_highlight === "string" ? options.customer_review_highlight.slice(0, 240) : null;
    const wantsInstallCta = Boolean(options?.install_cta) || /installer l'app|installation de l'app|incitation à installer/i.test(promptText);

    const formatOpeningHours = (value: unknown): string | null => {
      if (!value) return null;
      if (typeof value === "string") return value.trim() || null;
      if (typeof value !== "object") return null;

      const dayLabels: Record<string, string> = {
        monday: "Lundi",
        tuesday: "Mardi",
        wednesday: "Mercredi",
        thursday: "Jeudi",
        friday: "Vendredi",
        saturday: "Samedi",
        sunday: "Dimanche",
      };
      const orderedDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      const source = value as Record<string, any>;

      const formatSlot = (day: string, raw: any) => {
        const label = dayLabels[day] ?? day;
        if (typeof raw === "string") return `${label}: ${raw}`;
        if (!raw || typeof raw !== "object") return null;
        if (raw.closed) return `${label}: Fermé`;
        const first = raw.open && raw.close ? `${raw.open}–${raw.close}` : "";
        const second = raw.open2 && raw.close2 ? `${raw.open2}–${raw.close2}` : "";
        const hours = raw.continuous ? first : [first, second].filter(Boolean).join(" / ");
        return hours ? `${label}: ${hours}` : null;
      };

      const lines = orderedDays
        .filter((day) => day in source)
        .map((day) => formatSlot(day, source[day]))
        .filter(Boolean);

      return lines.length ? lines.join("\n") : null;
    };

    const systemPrompt = `Tu es directeur artistique pour One World Morocco. Tu choisis un template vidéo Remotion et fournis les props.

TEMPLATES DISPONIBLES :
${TEMPLATES.map(t => `- "${t.id}" — ${t.scope} : ${t.description}`).join("\n")}

RÈGLES DE CHOIX (STRICTES) :
1. Templates dédiés UNIQUEMENT si \`businessContext.name\` correspond EXACTEMENT (insensible à la casse) au scope : "Comptoir Darna", "Riad Dar Najat", "Maison Brummell", "Jnane Rumi", "N.A.R", "Farasha Farmhouse", "Bô Zin". Toute autre valeur → INTERDIT d'utiliser ces templates.
2. Si le prompt est purement corporate 1WM (sans \`businessContext\`) → "corporate-vertical".
3. DANS TOUS LES AUTRES CAS (défaut absolu) → "business-showcase" avec props complètes basées sur \`businessContext\`. NE JAMAIS substituer un autre nom d'établissement.

FORMAT DE RÉPONSE (JSON strict, AUCUN backtick) :
{
  "template_id": "business-showcase",
  "props": {
    "name": "Nom de l'établissement",
    "hook": "Hook exact de l'établissement, sans paraphrase",
    "tagline": "3 à 6 mots tirés du hook, sans ajout stylistique",
    "city": "Marrakech",
    "category": "Restaurant",
    "videos": ["url1", "url2"],
    "images": [],
    "offer": { "title": "Pass journée & déjeuner", "price": "60€ / 600 MAD", "lines": ["De 11h à 19h", "Piscine olympique 50 m", "Déjeuner produits locaux inclus", "Réservé aux adultes"], "background_video_url": null, "background_image_url": null }
  },
  "rationale": "Pourquoi ce template (1 phrase)"
}

CONTRAINTES STRICTES :
- RÈGLE MÉDIAS (ABSOLUE, s'applique à TOUS les templates) :
  1) Utilise EN PRIORITÉ les vidéos de l'établissement (medias où type="video" ou "internal-video"), triées dans l'ordre interne \`sort_order\`. Renseigne \`videos\` et laisse \`images: []\`.
  2) Si AUCUNE vidéo n'est disponible, alors et seulement alors utilise les images (medias type="image"), triées par \`sort_order\`. Renseigne \`images\` et laisse \`videos: []\`.
  3) NE JAMAIS mélanger vidéos et images dans une même vidéo : l'un OU l'autre, exclusivement.
- "videos"/"images" : UNIQUEMENT des URLs réelles tirées de \`medias\`. N'INVENTE JAMAIS d'URL.
- "offer" : renseigne-le dans DEUX cas :
  a) Une vraie promotion/prix existe dans \`medias\` (type=promotion ou champ price renseigné).
  b) L'utilisateur décrit dans son PROMPT une annonce/offre/message spécifique à afficher (prix, horaires spécifiques, conditions, contenu promo). Dans ce cas, retranscris fidèlement le message de l'utilisateur : \`title\` = accroche courte (≤60 car), \`price\` = prix si mentionné (ex : "60€ / 600 MAD"), \`lines\` = 2 à 6 lignes courtes (≤80 car chacune) reprenant les infos clés (horaires, inclusions, conditions, contact). Ne paraphrase pas au-delà du nécessaire pour tenir dans les limites.
  Sinon → \`"offer": null\`. Ne mets JAMAIS d'horaires ou de quartier dans \`offer\` s'ils ne sont pas explicitement dans le prompt utilisateur.
- "offer.background_video_url" / "offer.background_image_url" (optionnels) : si l'utilisateur demande explicitement une vidéo ou une image en FOND de la scène Offre (ex : "piscine en fond", "avec le jardin derrière"), choisis UNE URL réelle depuis \`medias\` dont le \`name\` ou la \`description\` correspond au mot-clé. Priorité à une vidéo. Sinon laisse ces champs à null.
- "name" : EXACTEMENT le nom de l'établissement fourni (champ businessContext.name).
- "hook" : utilise le champ \`hook\` du businessContext s'il existe ; sinon génère-en un court (≤80 caractères). Ne paraphrase JAMAIS le hook existant.
- "tagline" : 3 à 6 mots tirés du hook réel. N'ajoute JAMAIS de mot décoratif comme "terracotta", "bohème" ou "sauvage" s'il n'est pas déjà dans le hook.
- "city" : champ \`city\` du businessContext (sinon null).
- Pour les templates dédiés (hors business-showcase), renvoie \`"props": {}\` : ils sont hardcodés (ils respectent déjà la règle médias en interne).


OPTIONS / CONTRAINTES À ACTIVER DANS LE SCÉNARIO :
${wantsReviews ? `- Activer explicitement l'affichage des avis clients (note/20 et nombre d'avis de l'établissement).` : `- Désactiver l'affichage des avis clients.`}
${wantsHours ? `- Activer explicitement l'affichage des horaires d'ouverture de l'établissement.` : `- Désactiver les horaires.`}
${wantsMapMarker ? `- Activer explicitement la visualisation de la Google Map avec le marqueur.` : `- Désactiver le marqueur de carte.`}
${wantsDigitalId ? `- Activer une courte séquence ID numérique (fiche + partage + QR) AVANT l'incitation finale.` : `- Désactiver la séquence ID numérique.`}
${wantsInstallCta ? `- Activer l'incitation à installer l'app (One World Morocco) à la fin.` : `- Désactiver l'incitation de fin d'installation.`}

Si \`businessContext\` est null, l'établissement est introuvable dans la base : choisis quand même "business-showcase", remplis name/hook/tagline depuis le prompt utilisateur, mets \`"images": []\` et \`"offer": null\`.

Durée demandée : ${duration_sec}s · Ton : ${tone}.

${parentJob ? `MODE AFFINAGE : tu pars d'un scénario existant (ci-dessous) et tu appliques UNIQUEMENT les modifications décrites par l'utilisateur. Conserve template_id et toutes les autres props inchangées. Renvoie le JSON complet modifié.` : ""}`;

    const userPrompt = `Demande utilisateur : ${prompt}\n\nÉtablissement (peut être null si demande générique) :\n${JSON.stringify(businessContext, null, 2)}${parentJob ? `\n\nSCÉNARIO PRÉCÉDENT À AFFINER :\n${JSON.stringify({ template_id: parentJob.template_id, props: parentJob.template_props, prompt: parentJob.prompt }, null, 2)}` : ""}`;

    const scenarioModel = "google/gemini-3-flash-preview";
    const aiRes = await fetchAiGateway("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: scenarioModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    }, {
      supabase: supa,
      userId: callerContext.userId,
      affiliateId: callerContext.affiliateId,
      businessId: resolved_business_id,
      context: "studio-video-scenario",
      model: scenarioModel,
      metadata: { duration_sec, tone, parent_job_id: parentJob?.id ?? null },
    });

    if (aiRes.status === 429) return json({ error: "Limite IA atteinte, réessayez dans un instant." }, 429);
    if (aiRes.status === 402) return json({ error: "Crédits IA épuisés." }, 402);
    if (!aiRes.ok) return json({ error: `Erreur IA: ${await aiRes.text()}` }, 500);

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }

    // Validation + fallback robuste
    const validIds = TEMPLATES.map(t => t.id);
    let template_id = typeof parsed.template_id === "string" && validIds.includes(parsed.template_id)
      ? parsed.template_id
      : "business-showcase";
    // Si un établissement est ciblé (ou si l'utilisateur a coché des médias / options),
    // on force le template paramétrique `business-showcase` : les templates statiques
    // (farasha-farmhouse, etc.) ignorent la whitelist médias et les options.
    const hasManualSel = Array.isArray(options?.selected_images) && options.selected_images.length > 0
      || Array.isArray(options?.selected_videos) && options.selected_videos.length > 0;
    if (resolved_business_id || hasManualSel) {
      template_id = "business-showcase";
    }
    const template_props = parsed.props && typeof parsed.props === "object" ? parsed.props : {};

    // Nettoyage anti-hallucination des textes visibles.
    template_props.hook = cleanDisplayText(template_props.hook) || undefined;
    template_props.tagline = cleanDisplayText(template_props.tagline) || undefined;

    // Anti-hallucination : ne garder que des URLs réellement présentes dans medias
    const realMediaUrls = new Set<string>();
    if (businessContext?.medias) {
      for (const m of businessContext.medias) {
        if (m.url) realMediaUrls.add(m.url);
        if (m.thumbnail_url) realMediaUrls.add(m.thumbnail_url);
      }
    }
    if (Array.isArray(template_props.images)) {
      template_props.images = template_props.images.filter((u: unknown) =>
        typeof u === "string" && realMediaUrls.has(u)
      );
    } else {
      template_props.images = [];
    }
    if (Array.isArray(template_props.videos)) {
      template_props.videos = template_props.videos.filter((u: unknown) =>
        typeof u === "string" && realMediaUrls.has(u)
      );
    } else {
      template_props.videos = [];
    }

    // Filet de sécurité : on garde `offer` si (a) prix crédible ou (b) un titre + lines existent
    // (annonce/message venant du prompt utilisateur).
    if (template_props.offer && typeof template_props.offer === "object") {
      const off = template_props.offer;
      const priceStr = String(off.price || "").trim();
      const looksLikePrice = /(\d+\s*(mad|dhs?|€|\$|eur|usd))|^\d+$/i.test(priceStr);
      const title = cleanDisplayText(off.title) || "";
      const rawLines = Array.isArray(off.lines) ? off.lines : [];
      const lines = rawLines
        .map((l: unknown) => cleanDisplayText(typeof l === "string" ? l : ""))
        .filter((l: string) => !!l && l.length <= 120)
        .slice(0, 6);
      const hasContent = looksLikePrice || (title && lines.length > 0) || (title && looksLikePrice);
      if (!hasContent) {
        template_props.offer = null;
      } else {
        template_props.offer = {
          title: title || undefined,
          price: looksLikePrice ? priceStr : (priceStr || undefined),
          lines: lines.length ? lines : undefined,
        };
        // Fond d'écran optionnel de la scène Offre : accepte une URL fournie par l'IA
        // OU la déduit d'un mot-clé du prompt utilisateur (ex: "piscine en fond de l'offre").
        const bgVidFromIa = typeof off.background_video_url === "string" && realMediaUrls.has(off.background_video_url)
          ? off.background_video_url : null;
        const bgImgFromIa = typeof off.background_image_url === "string" && realMediaUrls.has(off.background_image_url)
          ? off.background_image_url : null;
        let bgVideo = bgVidFromIa;
        let bgImage = bgImgFromIa;

        if (!bgVideo && !bgImage) {
          const bgMatch = prompt.match(/(?:en\s+fond|fond\s+(?:de|du|d[e']|derrière))[^.\n]*?\b([a-zà-ÿ]{4,})\b/i)
            || prompt.match(/\b(piscine|jardin|terrasse|plage|spa|hammam|chambre|patio|restaurant|salon|bar|cuisine|coucher\s+de\s+soleil|sunset)\b/i);
          const keyword = bgMatch?.[1]?.toLowerCase().trim();
          if (keyword && Array.isArray(businessContext?.medias)) {
            const norm = (s: unknown) => (typeof s === "string" ? s.toLowerCase() : "");
            const scored = businessContext.medias
              .map((m: any) => ({
                m,
                hit: (norm(m?.name).includes(keyword) || norm(m?.description).includes(keyword)) ? 1 : 0,
              }))
              .filter((x: any) => x.hit && typeof x.m?.url === "string" && /^https?:\/\//i.test(x.m.url));
            const vid = scored.find((x: any) => x.m.type === "video" || x.m.type === "internal-video");
            const img = scored.find((x: any) => x.m.type === "image");
            if (vid) bgVideo = vid.m.url;
            else if (img) bgImage = img.m.url;
          }
        }
        if (bgVideo) template_props.offer.background_video_url = bgVideo;
        else if (bgImage) template_props.offer.background_image_url = bgImage;
      }
    }

    if (template_id === "business-showcase" && businessContext?.name) {
      // Toujours forcer le nom réel — l'IA n'a pas le droit de réécrire.
      template_props.name = businessContext.name;
    }
    if (template_id === "business-showcase" && !template_props.city && businessContext?.city) {
      template_props.city = businessContext.city;
    }
    if (template_id === "business-showcase" && businessContext?.neighborhood) {
      template_props.neighborhood = businessContext.neighborhood;
    }
    // Forcer le hook réel de l'établissement (hook_fr en priorité) — interdire toute paraphrase IA.
    if (template_id === "business-showcase" && businessContext) {
      const realHook = stripHtml(businessContext.hook_fr || businessContext.hook);
      if (realHook && typeof realHook === "string" && realHook.trim()) {
        template_props.hook = realHook.trim();
        const shouldUseFullHook = !template_props.offer && !hasInjectablePopup(businessContext);
        template_props.tagline = deriveTaglineFromHook(realHook, businessContext.name);
        template_props.useFullHookScene = shouldUseFullHook;
      }
    }

    // Injection serveur des options + vraies données BD (l'IA ne fournit pas ces champs).
    // Relecture dédiée juste avant l'insertion : évite qu'un échec du contexte média empêche
    // l'injection des avis / horaires / carte.
    let businessDetails = businessContext;
    if (resolved_business_id) {
      const { data: freshBiz } = await supa
        .from("businesses")
        .select("id,name,slug,hook_fr,destination_hook,poi_hook,description,city,neighborhood,opening_hours,latitude,longitude,address,computed_rating,google_rating,total_review_count,google_review_count,google_review_url,tripadvisor_rating,tripadvisor_review_count,tripadvisor_url,restaurant_guru_rating,restaurant_guru_review_count,restaurant_guru_url,logo_url,images,popup_image_url,whatsapp,instagram_url")
        .eq("id", resolved_business_id)
        .maybeSingle();
      if (freshBiz) businessDetails = { ...(businessContext ?? {}), ...freshBiz };
    }

    if (template_id === "business-showcase" && businessDetails) {
      if (businessDetails.name) template_props.name = businessDetails.name;
      if (businessDetails.city) template_props.city = businessDetails.city;
      if (businessDetails.neighborhood) template_props.neighborhood = businessDetails.neighborhood;
      const realHook = stripHtml(businessDetails.hook_fr || businessDetails.destination_hook || businessDetails.poi_hook || businessDetails.description);
      if (realHook) {
        template_props.hook = realHook;
        const shouldUseFullHook = !template_props.offer && !hasInjectablePopup(businessDetails);
        template_props.tagline = deriveTaglineFromHook(realHook, businessDetails.name);
        template_props.useFullHookScene = shouldUseFullHook;
      }

      // FORCE-INJECT médias depuis la BD (l'IA est trop peu fiable et peut renvoyer videos:[]).
      // Sélection manuelle (options.selected_images / selected_videos) → whitelist stricte
      // et autorisation du montage mixte images + vidéos. Sinon règle historique :
      // priorité aux vidéos internes ; à défaut images.
      const selImages = Array.isArray(options?.selected_images)
        ? options.selected_images.filter((u: unknown) => typeof u === "string" && /^https?:\/\//i.test(u as string)) as string[]
        : [];
      const selVideos = Array.isArray(options?.selected_videos)
        ? options.selected_videos.filter((u: unknown) => typeof u === "string" && /^https?:\/\//i.test(u as string)) as string[]
        : [];
      const hasManualSelection = selImages.length > 0 || selVideos.length > 0;

      if (hasManualSelection) {
        template_props.videos = Array.from(new Set(selVideos)).slice(0, 8);
        template_props.images = Array.from(new Set(selImages)).slice(0, 8);
      } else {
        const medias = Array.isArray(businessContext?.medias) ? businessContext.medias : [];
        const realVideos = medias
          .filter((m: any) => (m?.type === "video" || m?.type === "internal-video") && typeof m?.url === "string" && /^https?:\/\//i.test(m.url))
          .map((m: any) => m.url as string);
        const realImages = medias
          .filter((m: any) => m?.type === "image" && typeof m?.url === "string" && /^https?:\/\//i.test(m.url))
          .map((m: any) => m.url as string);
        if (realVideos.length > 0) {
          template_props.videos = Array.from(new Set(realVideos)).slice(0, 8);
          template_props.images = [];
        } else if (realImages.length > 0) {
          template_props.videos = [];
          template_props.images = Array.from(new Set(realImages)).slice(0, 8);
        }
      }

      // Sélection média par scène (facultatif). Whitelist stricte : chaque URL doit
      // appartenir aux médias autorisés de l'établissement (images ou vidéos internes).
      const rawSceneMedia = options?.scene_media;
      if (rawSceneMedia && typeof rawSceneMedia === "object") {
        const allowedUrls = new Set<string>();
        const medias = Array.isArray(businessContext?.medias) ? businessContext.medias : [];
        for (const m of medias) {
          if (typeof m?.url === "string" && /^https?:\/\//i.test(m.url)) allowedUrls.add(m.url);
        }
        // Autoriser aussi les URLs déjà passées via la sélection globale (au cas où)
        selImages.forEach((u) => allowedUrls.add(u));
        selVideos.forEach((u) => allowedUrls.add(u));

        const ALLOWED_KINDS = new Set(["hook", "name", "media", "offer", "reviews", "hours", "map", "digital", "cta", "outro"]);
        const cleaned: Record<string, Array<{ url: string; kind: "image" | "video" }>> = {};
        for (const [k, v] of Object.entries(rawSceneMedia)) {
          if (!ALLOWED_KINDS.has(k) || !Array.isArray(v)) continue;
          const items = (v as any[])
            .map((it) => (it && typeof it.url === "string" && (it.kind === "image" || it.kind === "video"))
              ? { url: it.url as string, kind: it.kind as "image" | "video" }
              : null)
            .filter((it): it is { url: string; kind: "image" | "video" } => !!it && allowedUrls.has(it.url))
            .slice(0, 8);
          if (items.length) cleaned[k] = items;
        }
        if (Object.keys(cleaned).length) template_props.scene_media = cleaned;
      }

      // Étapes personnalisées ajoutées par l'utilisateur dans l'aperçu (carton texte ou overlay).
      // Whitelist stricte : URL média doit appartenir aux médias autorisés.
      const rawCustomScenes = options?.custom_scenes;
      const cleanedCustomScenes: Array<{
        id: string;
        mode: "fullscreen" | "overlay";
        title: string;
        subtitle?: string;
        duration: number;
        media?: { url: string; kind: "image" | "video" };
      }> = [];
      if (Array.isArray(rawCustomScenes)) {
        const allowedUrlsForCustom = new Set<string>();
        const mediasForCustom = Array.isArray(businessContext?.medias) ? businessContext.medias : [];
        for (const m of mediasForCustom) {
          if (typeof m?.url === "string" && /^https?:\/\//i.test(m.url)) allowedUrlsForCustom.add(m.url);
        }
        selImages.forEach((u) => allowedUrlsForCustom.add(u));
        selVideos.forEach((u) => allowedUrlsForCustom.add(u));
        for (const c of rawCustomScenes as any[]) {
          if (!c || typeof c !== "object") continue;
          const id = typeof c.id === "string" && /^[a-zA-Z0-9_-]{3,40}$/.test(c.id) ? c.id : null;
          const mode = c.mode === "overlay" ? "overlay" : "fullscreen";
          const title = typeof c.title === "string" ? c.title.trim().slice(0, 120) : "";
          const subtitle = typeof c.subtitle === "string" ? c.subtitle.trim().slice(0, 240) : "";
          const dur = Number(c.duration);
          if (!id || !title || !Number.isFinite(dur) || dur < 1 || dur > 60) continue;
          let media: { url: string; kind: "image" | "video" } | undefined;
          if (c.media && typeof c.media.url === "string" && (c.media.kind === "image" || c.media.kind === "video") && allowedUrlsForCustom.has(c.media.url)) {
            media = { url: c.media.url, kind: c.media.kind };
          }
          if (mode === "overlay" && !media) continue;
          cleanedCustomScenes.push({ id, mode, title, subtitle: subtitle || undefined, duration: Math.round(dur), media });
          if (cleanedCustomScenes.length >= 8) break;
        }
        if (cleanedCustomScenes.length) template_props.custom_scenes = cleanedCustomScenes;
      }
      const allowedCustomIds = new Set(cleanedCustomScenes.map((c) => `custom:${c.id}`));

      // "Ouvrir avec le logo" — active la scène logo d'intro dans Remotion.
      const wantsLogoIntro = !!options?.open_with_logo;
      const logoUrlFromClient = typeof options?.logo_url === "string" && /^https?:\/\//i.test(options.logo_url as string)
        ? (options.logo_url as string)
        : (businessDetails.logo_url || null);
      if (wantsLogoIntro && logoUrlFromClient) {
        template_props.openWithLogo = true;
        template_props.logoUrl = logoUrlFromClient;
      }

      // Zone libre — étape "media" optionnelle avec texte + médias de fond au choix
      const wantsFreeZone = !!options?.free_zone;
      if (wantsFreeZone) {
        template_props.freeZone = true;
        const fzTitle = typeof options?.free_zone_title === "string" ? options.free_zone_title.trim().slice(0, 80) : "";
        const fzSub = typeof options?.free_zone_subtitle === "string" ? options.free_zone_subtitle.trim().slice(0, 160) : "";
        if (fzTitle) template_props.freeZoneTitle = fzTitle;
        if (fzSub) template_props.freeZoneSubtitle = fzSub;
      }

      // Ordre et durées personnalisés des scènes (édités par l'utilisateur dans l'aperçu)
      const ALLOWED_SCENE_KINDS = new Set(["logo", "hook", "name", "media", "offer", "reviews", "hours", "map", "digital", "cta", "outro"]);
      const rawOrder = options?.scene_order;
      let orderedFromClient: string[] | null = null;
      if (Array.isArray(rawOrder)) {
        const seen = new Set<string>();
        const cleanedOrder: string[] = [];
        for (const k of rawOrder) {
          if (typeof k !== "string" || seen.has(k)) continue;
          // Zone libre désactivée → on retire "media" de l'ordre
          if (k === "media" && !wantsFreeZone) continue;
          if (ALLOWED_SCENE_KINDS.has(k) || allowedCustomIds.has(k)) {
            seen.add(k);
            cleanedOrder.push(k);
          }
        }
        if (cleanedOrder.length) orderedFromClient = cleanedOrder;
      }
      // Si logo intro demandé, on force sa présence en tête de l'ordre.
      if (wantsLogoIntro && logoUrlFromClient) {
        const base = orderedFromClient ?? [];
        const withoutLogo = base.filter((k) => k !== "logo");
        orderedFromClient = ["logo", ...withoutLogo];
      }
      if (orderedFromClient && orderedFromClient.length) {
        template_props.scene_order = orderedFromClient;
      }
      const rawDurations = options?.scene_durations;
      if (rawDurations && typeof rawDurations === "object") {
        const cleanedDur: Record<string, number> = {};
        for (const [k, v] of Object.entries(rawDurations)) {
          if (!ALLOWED_SCENE_KINDS.has(k)) continue;
          const n = Number(v);
          if (Number.isFinite(n) && n >= 1 && n <= 60) cleanedDur[k] = Math.round(n);
        }
        if (Object.keys(cleanedDur).length) template_props.scene_durations = cleanedDur;
      }

      // Position verticale du texte dans les scènes (haut / milieu / bas)
      const rawTextPosition = options?.text_position;
      if (rawTextPosition === "top" || rawTextPosition === "middle" || rawTextPosition === "bottom") {
        template_props.textPosition = rawTextPosition;
      }

      template_props.durationSec = Number(duration_sec);
      // Le ton pilote le rendu Remotion (Ken Burns, fondus, finition visuelle).
      if (tone === "immersif" || tone === "dynamique" || tone === "elegant") {
        template_props.tone = tone;
      }
      const googleRating = Number(businessDetails.google_rating);
      const computedRating = Number(businessDetails.computed_rating);
      const googleReviews = Number(businessDetails.google_review_count);
      const totalReviews = Number(businessDetails.total_review_count);
      const rating = Number.isFinite(googleRating) && googleRating > 0
        ? googleRating
        : (Number.isFinite(computedRating) && computedRating > 0 ? computedRating : null);
      const reviewsCount = Number.isFinite(googleReviews) && googleReviews > 0
        ? googleReviews
        : (Number.isFinite(totalReviews) && totalReviews > 0 ? totalReviews : null);

      if (wantsReviews) {
        template_props.showReviews = true;
        template_props.rating = rating;
        template_props.reviewsCount = reviewsCount;
      }
      // Plateformes d'avis externes
      if (wantsGoogleReviews) {
        const gr = Number(businessDetails.google_rating);
        const gc = Number(businessDetails.google_review_count);
        const gu = typeof businessDetails.google_review_url === "string" ? businessDetails.google_review_url : null;
        if ((Number.isFinite(gr) && gr > 0) || (Number.isFinite(gc) && gc > 0) || gu) {
          template_props.showGoogleReviews = true;
          template_props.googleReview = {
            rating: Number.isFinite(gr) && gr > 0 ? gr : null,
            count: Number.isFinite(gc) && gc > 0 ? gc : null,
            url: gu,
          };
        }
      }
      if (wantsTripAdvisor) {
        const tr = Number((businessDetails as any).tripadvisor_rating);
        const tc = Number((businessDetails as any).tripadvisor_review_count);
        const tu = typeof (businessDetails as any).tripadvisor_url === "string" ? (businessDetails as any).tripadvisor_url : null;
        if ((Number.isFinite(tr) && tr > 0) || (Number.isFinite(tc) && tc > 0) || tu) {
          template_props.showTripAdvisor = true;
          template_props.tripAdvisor = {
            rating: Number.isFinite(tr) && tr > 0 ? tr : null,
            count: Number.isFinite(tc) && tc > 0 ? tc : null,
            url: tu,
          };
        }
      }
      if (wantsRestaurantGuru) {
        const rr = Number((businessDetails as any).restaurant_guru_rating);
        const rc = Number((businessDetails as any).restaurant_guru_review_count);
        const ru = typeof (businessDetails as any).restaurant_guru_url === "string" ? (businessDetails as any).restaurant_guru_url : null;
        if ((Number.isFinite(rr) && rr > 0) || (Number.isFinite(rc) && rc > 0) || ru) {
          template_props.showRestaurantGuru = true;
          template_props.restaurantGuru = {
            rating: Number.isFinite(rr) && rr > 0 ? rr : null,
            count: Number.isFinite(rc) && rc > 0 ? rc : null,
            url: ru,
          };
        }
      }
      if (wantsCustomerReview && customerReviewId) {
        try {
          const { data: revRow } = await supa
            .from("reviews")
            .select("id,author_name,rating,text,text_fr,source,published_at")
            .eq("id", customerReviewId)
            .maybeSingle();
          if (revRow) {
            const fullText = (revRow.text_fr || revRow.text || "").toString();
            template_props.showCustomerReview = true;
            template_props.customerReview = {
              id: revRow.id,
              author: revRow.author_name || null,
              rating: revRow.rating != null ? Number(revRow.rating) : null,
              text: fullText.slice(0, 800),
              highlight: customerReviewHighlight || fullText.split(/(?<=[.!?])\s+/)[0]?.slice(0, 200) || fullText.slice(0, 200),
              source: revRow.source || null,
            };
          }
        } catch (_) { /* silent */ }
      }
      const formattedOpeningHours = formatOpeningHours(businessDetails.opening_hours);
      if (wantsHours && formattedOpeningHours) {
        template_props.showOpeningHours = true;
        template_props.openingHours = formattedOpeningHours;
      }
      const latitude = Number(businessDetails.latitude);
      const longitude = Number(businessDetails.longitude);
      if (wantsMapMarker && Number.isFinite(latitude) && Number.isFinite(longitude)) {
        template_props.showMap = true;
        template_props.latitude = latitude;
        template_props.longitude = longitude;
        template_props.address = businessDetails.address ?? null;
      }
      if (wantsDigitalId && (businessDetails.slug || businessDetails.id)) {
        template_props.showDigitalId = true;
        template_props.slug = businessDetails.slug || businessDetails.id;
        const firstImg = Array.isArray(businessDetails.images) ? businessDetails.images.find((u: unknown) => typeof u === "string" && /^https?:\/\//i.test(u)) : null;
        template_props.logoUrl = businessDetails.logo_url || firstImg || null;
        template_props.whatsapp = businessDetails.whatsapp || null;
        template_props.instagramUrl = businessDetails.instagram_url || null;
        if (rating) template_props.rating = rating;
        if (reviewsCount) template_props.reviewsCount = reviewsCount;

        // Capture mobile screenshot of the live published fiche via Firecrawl, upload to storage
        // and pass the URL to Remotion so SceneDigitalId shows the exact published page.
        try {
          const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
          if (fcKey) {
            const ficheUrl = `https://oneworldmorocco.com/b/${encodeURIComponent(template_props.slug)}`;
            const fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
              method: "POST",
              headers: { "Authorization": `Bearer ${fcKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                url: ficheUrl,
                formats: ["screenshot"],
                onlyMainContent: false,
                mobile: true,
                waitFor: 2500,
              }),
            });
            const fcJson = await fcRes.json().catch(() => null) as any;
            const shotUrl: string | undefined = fcJson?.data?.screenshot || fcJson?.screenshot;
            if (shotUrl && /^https?:\/\//i.test(shotUrl)) {
              const imgRes = await fetch(shotUrl);
              if (imgRes.ok) {
                const bytes = new Uint8Array(await imgRes.arrayBuffer());
                const path = `fiches/${template_props.slug}-${Date.now()}.png`;
                const up = await supa.storage.from("studio-videos").upload(path, bytes, {
                  contentType: "image/png",
                  upsert: true,
                });
                if (!up.error) {
                  const { data: pub } = supa.storage.from("studio-videos").getPublicUrl(path);
                  if (pub?.publicUrl) template_props.ficheScreenshotUrl = pub.publicUrl;
                }
              }
            }
          }
        } catch (e) {
          console.warn("[digital_id] firecrawl screenshot failed", (e as Error).message);
        }
      }
      // Toujours refléter le choix utilisateur : true = incitation à installer l'app,
      // false = pas de scène finale de CTA (le rendu Remotion supprimera la scène cta).
      template_props.showAppInstall = wantsInstallCta;

      // Injection serveur des offres sélectionnées par l'utilisateur.
      // On force la présence de `offer` en base plutôt que compter sur l'IA
      // (l'IA a tendance à ignorer les offres si aucune n'est présente dans `medias`).
      const rawOfferIds = Array.isArray(options?.offer_ids) ? options.offer_ids : [];
      const offerIds = rawOfferIds.filter((v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v));
      if (offerIds.length > 0) {
        const { data: offerRows } = await supa
          .from("affiliate_business_promotions")
          .select("id,title,title_fr,promotion_type,promotion_value,promotion_currency,promotion_message,promotion_message_fr,savings_amount,sort_order")
          .eq("business_id", resolved_business_id)
          .in("id", offerIds)
          .order("sort_order", { ascending: true });
        // Preserve the exact user-selected order (offerIds) when sort_order collides.
        const rows = (offerRows ?? []).slice().sort((a: any, b: any) => {
          const ia = offerIds.indexOf(a.id);
          const ib = offerIds.indexOf(b.id);
          return ia - ib;
        });
        const built = rows
          .map((row: any) => {
            const title = cleanDisplayText(row.title_fr || row.title) || undefined;
            const priceStr = row.promotion_type === "percentage" && row.promotion_value != null
              ? `-${row.promotion_value}%`
              : row.promotion_type === "fixed" && row.promotion_value != null
                ? `-${row.promotion_value} ${row.promotion_currency || "MAD"}`
                : row.savings_amount != null
                  ? `-${row.savings_amount} ${row.promotion_currency || "MAD"}`
                  : undefined;
            const rawMsg = stripHtml(row.promotion_message_fr || row.promotion_message) || "";
            const lines = rawMsg
              ? rawMsg.split(/[\n•·|]+|(?:\.\s)/).map((l: string) => cleanDisplayText(l) || "").filter((l: string) => l && l.length <= 120).slice(0, 6)
              : [];
            if (!title && !priceStr && lines.length === 0) return null;
            return { title, price: priceStr, lines: lines.length ? lines : undefined };
          })
          .filter((o: any) => o !== null);
        if (built.length > 0) {
          template_props.offers = built;
          template_props.offer = built[0]; // backward compat with single-offer template
        }
      }

      // Popup (image d'accueil) — expose une scène dédiée si option cochée et image disponible.
      const wantsPopup = !!options?.popup;
      if (wantsPopup && businessDetails.popup_image_url) {
        template_props.showPopup = true;
        template_props.popupImageUrl = businessDetails.popup_image_url;
      }

      // Blocs highlights sélectionnés — une entrée par bloc dans le scénario.
      const rawHighlightIds = Array.isArray(options?.highlight_ids) ? options.highlight_ids : [];
      const highlightIds = rawHighlightIds.filter((v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v));
      if (highlightIds.length > 0) {
        const { data: hlRows } = await supa
          .from("front_highlights")
          .select("id,icon,image_url,title_fr,description_fr,metric_title_fr,metric_value_fr,sort_order")
          .eq("business_id", resolved_business_id)
          .in("id", highlightIds)
          .order("sort_order", { ascending: true });
        const rows = (hlRows ?? []).slice().sort((a: any, b: any) => {
          const ia = highlightIds.indexOf(a.id);
          const ib = highlightIds.indexOf(b.id);
          return ia - ib;
        });
        const builtH = rows
          .map((row: any) => {
            const title = cleanDisplayText(row.title_fr) || "";
            const description = stripHtml(row.description_fr) || "";
            const metric_title = cleanDisplayText(row.metric_title_fr) || "";
            const metric_value = cleanDisplayText(row.metric_value_fr) || "";
            if (!title && !description && !row.image_url && !metric_title && !metric_value) return null;
            return {
              id: row.id,
              icon: row.icon || null,
              image_url: row.image_url || null,
              title,
              description,
              metric_title: metric_title || undefined,
              metric_value: metric_value || undefined,
            };
          })
          .filter((h: any) => h !== null);
        if (builtH.length > 0) {
          template_props.highlights = builtH;
        }
      }
    }

    if (preview_only) {
      return json({
        preview: true,
        template_id,
        template_props,
        resolved_business_id,
        rationale: parsed.rationale,
        duration_sec,
      });
    }

    const { data: job, error } = await supa
      .from("video_jobs")
      .insert({
        business_id: resolved_business_id,
        user_id: callerUserId,
        prompt,
        duration_sec,
        tone,
        template_id,
        template_props,
        scenario_json: parsed,
        status: "pending",
        parent_job_id: parentJob?.id ?? null,
      })
      .select()
      .single();

    if (error) return json({ error: error.message }, 500);

    return json({ job, template_id, resolved_business_id, rationale: parsed.rationale });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
