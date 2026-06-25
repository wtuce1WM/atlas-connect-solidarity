import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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
    const { prompt, business_id, duration_sec = 22, tone = "immersif", parent_job_id, options } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.length > 2000) {
      return json({ error: "prompt invalide" }, 400);
    }
    if (![17, 22, 27].includes(Number(duration_sec))) {
      return json({ error: "duration_sec doit être 17, 22 ou 27" }, 400);
    }

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Charger un éventuel job parent pour affinage
    let parentJob: any = null;
    if (parent_job_id && typeof parent_job_id === "string") {
      const { data } = await supa
        .from("video_jobs")
        .select("id,prompt,template_id,template_props,business_id,duration_sec,tone")
        .eq("id", parent_job_id)
        .maybeSingle();
      if (data) parentJob = data;
    }

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
        .select("id,name,hook_fr,city,neighborhood,main_category,categories,opening_hours,latitude,longitude,address,computed_rating,google_rating,total_review_count,google_review_count,popup_title,popup_description,images,popup_image_url")
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
        hook: biz?.hook_fr ?? biz?.popup_title ?? biz?.popup_description ?? null,
        medias: mergedMedias,
      };
    }

    const promptText = prompt.toLowerCase();
    const wantsReviews = Boolean(options?.reviews) || /avis client|badge des avis|note\/20|nombre d'avis|compteur d'avis/i.test(promptText);
    const wantsHours = Boolean(options?.hours) || /horaires|heures d'ouverture|ouverture de l'établissement/i.test(promptText);
    const wantsMapMarker = Boolean(options?.map_marker) || /google\s*map|marqueur de l'établissement|marqueur.*carte|localisation/i.test(promptText);
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
    "hook": "Une phrase courte, ciselée, immersive",
    "tagline": "3 à 6 mots, dernier mot accentué (terracotta)",
    "city": "Marrakech",
    "category": "Restaurant",
    "videos": ["url1", "url2"],
    "images": [],
    "offer": { "title": "Brunch signature", "price": "350 MAD" }
  },
  "rationale": "Pourquoi ce template (1 phrase)"
}

CONTRAINTES STRICTES :
- RÈGLE MÉDIAS (ABSOLUE, s'applique à TOUS les templates) :
  1) Utilise EN PRIORITÉ les vidéos de l'établissement (medias où type="video" ou "internal-video"), triées dans l'ordre interne \`sort_order\`. Renseigne \`videos\` et laisse \`images: []\`.
  2) Si AUCUNE vidéo n'est disponible, alors et seulement alors utilise les images (medias type="image"), triées par \`sort_order\`. Renseigne \`images\` et laisse \`videos: []\`.
  3) NE JAMAIS mélanger vidéos et images dans une même vidéo : l'un OU l'autre, exclusivement.
- "videos"/"images" : UNIQUEMENT des URLs réelles tirées de \`medias\`. N'INVENTE JAMAIS d'URL.
- "offer" : UNIQUEMENT s'il existe une vraie promotion/prix dans \`medias\` (type=promotion ou champ price renseigné). Sinon \`"offer": null\`. Ne mets JAMAIS d'horaires ou de quartier dans \`offer\`.
- "name" : EXACTEMENT le nom de l'établissement fourni (champ businessContext.name).
- "hook" : utilise le champ \`hook\` du businessContext s'il existe ; sinon génère-en un court (≤80 caractères).
- "tagline" : 3 à 6 mots, le dernier sera colorisé automatiquement.
- "city" : champ \`city\` du businessContext (sinon null).
- Pour les templates dédiés (hors business-showcase), renvoie \`"props": {}\` : ils sont hardcodés (ils respectent déjà la règle médias en interne).


OPTIONS / CONTRAINTES À ACTIVER DANS LE SCÉNARIO :
${wantsReviews ? `- Activer explicitement l'affichage des avis clients (note/20 et nombre d'avis de l'établissement).` : `- Désactiver l'affichage des avis clients.`}
${wantsHours ? `- Activer explicitement l'affichage des horaires d'ouverture de l'établissement.` : `- Désactiver les horaires.`}
${wantsMapMarker ? `- Activer explicitement la visualisation de la Google Map avec le marqueur.` : `- Désactiver le marqueur de carte.`}
${wantsInstallCta ? `- Activer l'incitation à installer l'app (One World Morocco) à la fin.` : `- Désactiver l'incitation de fin d'installation.`}

Si \`businessContext\` est null, l'établissement est introuvable dans la base : choisis quand même "business-showcase", remplis name/hook/tagline depuis le prompt utilisateur, mets \`"images": []\` et \`"offer": null\`.

Durée demandée : ${duration_sec}s · Ton : ${tone}.

${parentJob ? `MODE AFFINAGE : tu pars d'un scénario existant (ci-dessous) et tu appliques UNIQUEMENT les modifications décrites par l'utilisateur. Conserve template_id et toutes les autres props inchangées. Renvoie le JSON complet modifié.` : ""}`;

    const userPrompt = `Demande utilisateur : ${prompt}\n\nÉtablissement (peut être null si demande générique) :\n${JSON.stringify(businessContext, null, 2)}${parentJob ? `\n\nSCÉNARIO PRÉCÉDENT À AFFINER :\n${JSON.stringify({ template_id: parentJob.template_id, props: parentJob.template_props, prompt: parentJob.prompt }, null, 2)}` : ""}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
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
    const template_props = parsed.props && typeof parsed.props === "object" ? parsed.props : {};

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

    // Filet de sécurité : si offer ne contient pas un vrai prix MAD/€/$, on jette
    if (template_props.offer && typeof template_props.offer === "object") {
      const priceStr = String(template_props.offer.price || "");
      const looksLikePrice = /(\d+\s*(mad|dhs?|€|\$|eur|usd))|^\d+$/i.test(priceStr.trim());
      if (!looksLikePrice) template_props.offer = null;
    }

    if (template_id === "business-showcase" && !template_props.name && businessContext?.name) {
      template_props.name = businessContext.name;
    }
    if (template_id === "business-showcase" && !template_props.city && businessContext?.city) {
      template_props.city = businessContext.city;
    }

    // Injection serveur des options + vraies données BD (l'IA ne fournit pas ces champs).
    // Relecture dédiée juste avant l'insertion : évite qu'un échec du contexte média empêche
    // l'injection des avis / horaires / carte.
    let businessDetails = businessContext;
    if (resolved_business_id) {
      const { data: freshBiz } = await supa
        .from("businesses")
        .select("id,name,city,opening_hours,latitude,longitude,address,computed_rating,google_rating,total_review_count,google_review_count")
        .eq("id", resolved_business_id)
        .maybeSingle();
      if (freshBiz) businessDetails = { ...(businessContext ?? {}), ...freshBiz };
    }

    if (template_id === "business-showcase" && businessDetails) {
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
      if (wantsInstallCta) {
        template_props.showAppInstall = true;
      }
    }

    const { data: job, error } = await supa
      .from("video_jobs")
      .insert({
        business_id: resolved_business_id,
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
