import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, spokenText, businesses = [], language = "fr", vary, mode, history = [], nearbyContext } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ answer: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Proximity ambiguity detection (refinement turns only) ---
    // When the user writes "à côté", "près de", "proche", etc. WITHOUT specifying
    // the referent (previous results / their location / a place), we don't guess —
    // we return a `clarify` payload so the UI can ask via clickable badges.
    const isRefinementTurn = Array.isArray(history) && history.length > 0;
    if (isRefinementTurn && !nearbyContext) {
      const PROX_RE = /\b(à\s+côté|a\s+cote|à\s+coté|près\b|pres\b|proche|à\s+proximité|a\s+proximite|autour|aux\s+alentours|near\b|close\s+to|next\s+to|around)\b/i;
      // Referent already explicit → no ambiguity.
      const REFERENT_RE = /\b(r[ée]sultats?\s+pr[ée]c[ée]dents?|d[ée]j[àa]\s+cit[ée]s?|de\s+moi|près\s+de\s+moi|pres\s+de\s+moi|ma\s+position|near\s+me|previous\s+results?|de\s+(la\s+|l[' ’]|le\s+)?[A-ZÉÈÀÂÎÔÛÇ][\wÀ-ÿ'’\- ]{2,})/i;
      if (PROX_RE.test(query) && !REFERENT_RE.test(query)) {
        const isEn = language === "en";
        return new Response(
          JSON.stringify({
            answer: "",
            clarify: {
              type: "proximity",
              question: isEn
                ? "Close to what exactly?"
                : "À proximité de quoi exactement ?",
              options: [
                {
                  id: "near_previous",
                  label: isEn ? "Near the previous results" : "À côté des résultats précédents",
                  text: `${query} ${isEn ? "(near the previous results)" : "(à côté des résultats précédents)"}`,
                },
                {
                  id: "near_me",
                  label: isEn ? "Near my location" : "Près de ma position",
                  text: `${query} ${isEn ? "(near my current location)" : "(près de ma position actuelle)"}`,
                },
                {
                  id: "anywhere",
                  label: isEn ? "Anywhere in the search area" : "Partout dans la zone de recherche",
                  text: `${query} ${isEn ? "(anywhere in the current search area)" : "(partout dans la zone de recherche actuelle)"}`,
                },
              ],
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch AI config from DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);
    
    const { data: configRows } = await sb.from("ai_config").select("key, value");
    const cfg: Record<string, string> = {};
    (configRows || []).forEach((r: any) => { cfg[r.key] = r.value; });

    const persona = cfg.persona || "Tu es un concierge expert du Maroc, chaleureux et passionné. Tu aides les utilisateurs à trouver les meilleurs établissements.";
    const tone = cfg.tone || "Sois naturel et enthousiaste, comme un ami local passionné qui partage ses meilleures adresses.";
    const responseLength = cfg.response_length || "5-8";
    const model = cfg.model || "google/gemini-3-flash-preview";
    const maxTokens = parseInt(cfg.max_tokens || "1200", 10);
    const temperature = parseFloat(cfg.temperature || "0.7");
    const extraInstructions = cfg.extra_instructions || "";
    const noResultsCfg = cfg.no_results_instructions || "";
    const boostVerified = cfg.boost_verified !== "false";

    // For the initial suggestion we keep 10 businesses to stay concise.
    // For chat refinements (history present), expose the full pool so the model can
    // pick relevant matches across ALL results — not just the first 10.
    const isRefinement = Array.isArray(history) && history.length > 0;
    const topBusinesses = businesses.slice(0, isRefinement ? 60 : 10);
    const hasResults = topBusinesses.length > 0;


    // Collect business IDs from results for direct linking
    const businessIds = topBusinesses.map((b: any) => b.id).filter(Boolean);



    // Enrich businesses with services, engagements, badges and video badges (server-side)
    // so the model can filter on real criteria (services, RSE, certifications, video tags…).
    const enrichment: Record<string, { services?: string[]; engagements?: string[]; badges?: string[]; video_badges?: string[] }> = {};
    if (businessIds.length > 0) {
      const [bizRows, badgeLinks, videoRows] = await Promise.all([
        sb.from("businesses").select("id, services, engagements").in("id", businessIds),
        sb.from("business_badges").select("business_id, badges(name_fr)").in("business_id", businessIds),
        sb.from("business_youtube_videos")
          .select("business_id, business_youtube_video_badges(badges(name_fr))")
          .in("business_id", businessIds)
          .eq("is_visible", true),
      ]);
      (bizRows.data || []).forEach((r: any) => {
        enrichment[r.id] = enrichment[r.id] || {};
        enrichment[r.id].services = Array.isArray(r.services) ? r.services.filter(Boolean) : [];
        enrichment[r.id].engagements = Array.isArray(r.engagements) ? r.engagements.filter(Boolean) : [];
      });
      (badgeLinks.data || []).forEach((r: any) => {
        const name = r.badges?.name_fr;
        if (!name) return;
        enrichment[r.business_id] = enrichment[r.business_id] || {};
        (enrichment[r.business_id].badges = enrichment[r.business_id].badges || []).push(name);
      });
      (videoRows.data || []).forEach((r: any) => {
        const names = (r.business_youtube_video_badges || []).map((x: any) => x.badges?.name_fr).filter(Boolean);
        if (names.length === 0) return;
        enrichment[r.business_id] = enrichment[r.business_id] || {};
        const arr = (enrichment[r.business_id].video_badges = enrichment[r.business_id].video_badges || []);
        names.forEach((n: string) => { if (!arr.includes(n)) arr.push(n); });
      });
    }

    // Fetch knowledge entries to enrich AI context
    const queryTerms = query.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
    let knowledgeContext = "";
    const knowledgeEntries: any[] = [];

    // 1. Fetch by business_id link
    if (businessIds.length > 0) {
      const { data: linkedRows } = await sb
        .from("knowledge_entries")
        .select("title, content, category, tags, business_id")
        .in("business_id", businessIds)
        .eq("is_active", true)
        .limit(10);
      if (linkedRows) knowledgeEntries.push(...linkedRows);
    }

    // 2. Fetch by text matching (existing logic)
    if (queryTerms.length > 0) {
      const aiCategories = ["general", "tourisme", "culture", "gastronomie"];
      const orFilters = queryTerms.map((t: string) => `title.ilike.%${t}%,content.ilike.%${t}%,tags.cs.{${t}}`).join(",");
      const { data: knowledgeRows } = await sb
        .from("knowledge_entries")
        .select("title, content, category, tags, business_id")
        .in("category", aiCategories)
        .eq("is_active", true)
        .or(orFilters)
        .limit(5);
      if (knowledgeRows) {
        const existingTitles = new Set(knowledgeEntries.map((k: any) => k.title));
        for (const row of knowledgeRows) {
          if (!existingTitles.has((row as any).title)) knowledgeEntries.push(row);
        }
      }
    }

    if (knowledgeEntries.length > 0) {
      knowledgeContext = knowledgeEntries
        .map((k: any) => {
          const truncated = k.content.length > 300 ? k.content.substring(0, 300) + "…" : k.content;
          return `[${k.category}] ${k.title}: ${truncated}`;
        })
        .join("\n");
      console.log(`Found ${knowledgeEntries.length} knowledge entries for query "${query}" (${businessIds.length} by business link)`);
    }

    const businessContext = hasResults
      ? topBusinesses.map((b: any, i: number) => {
          const parts = [`${i + 1}. ${b.name}`];
          if (b.wtuce_status === "verified") parts.push(`[CONFIANCE]`);
          if (b.city) parts.push(`(${b.city}${b.neighborhood ? ` · ${b.neighborhood}` : ""})`);
          if (b.address) parts.push(`— Adresse: ${b.address}`);
          if (b.main_category) parts.push(`— ${b.main_category}`);
          if (b.hook_fr) parts.push(`— "${b.hook_fr}"`);
          if (b.categories?.length) parts.push(`— Sous-catégories: ${b.categories.join(", ")}`);
          const enr = b.id ? enrichment[b.id] : undefined;
          if (enr?.services?.length) parts.push(`— Services: ${enr.services.slice(0, 30).join(", ")}`);
          if (enr?.engagements?.length) parts.push(`— Engagements: ${enr.engagements.slice(0, 20).join(", ")}`);
          if (enr?.badges?.length) parts.push(`— Badges: ${enr.badges.slice(0, 15).join(", ")}`);
          if (enr?.video_badges?.length) parts.push(`— Badges vidéos: ${enr.video_badges.slice(0, 15).join(", ")}`);
          return parts.join(" ");
        }).join("\n")
      : "(Aucun établissement trouvé dans l'annuaire pour cette recherche)";

    const langInstructions = language === "en"
      ? "Answer in English."
      : language === "ar"
        ? "Answer in Arabic."
        : "Réponds en français.";

    const noResultsInstructions = !hasResults
      ? `\n- ${noResultsCfg || "Utilise tes connaissances générales sur le Maroc pour donner des conseils utiles."}
- IMPORTANT : Ne cite AUCUN nom d'établissement spécifique. Tu ne connais pas notre annuaire, donc n'invente pas de noms. Donne uniquement des conseils généraux sur la thématique ou la destination.
- Si la recherche mentionne une ville marocaine, partage ce que tu sais sur cette ville en rapport avec la requête.
- Propose à l'utilisateur d'affiner sa recherche ou de chercher avec d'autres mots-clés.`
      : `\n- Si la liste contient peu de résultats (1-2), complète ta réponse avec des conseils généraux sur la destination/thématique pour enrichir l'expérience.`;

    // Build mode-specific prompt overrides for POI / Destinations tabs
    const modeInstructions = mode === "poi"
      ? `\n- MODE LIEUX D'INTÉRÊT : Présente les lieux d'intérêt (POI) fournis de façon vivante et enthousiaste. Décris chaque lieu en quelques mots (ambiance, histoire, ce qu'on peut y voir/faire). Cite jusqu'à 10 lieux par leur nom exact entouré de **doubles astérisques**.`
      : mode === "destinations"
      ? `\n- MODE DESTINATIONS : Présente les destinations fournies de façon inspirante et détaillée. Pour chaque destination, décris brièvement ce qui la rend unique (paysages, activités, culture). Cite jusqu'à 10 destinations par leur nom exact entouré de **doubles astérisques**.`
      : '';

    const systemPrompt = `${persona}

RÈGLES :
- ${langInstructions}
- Réponds en ${responseLength} phrases, de façon détaillée, chaleureuse et enthousiaste.
- Utilise des émojis pertinents pour rendre la réponse vivante (🍽️ 🐟 🌊 ⭐ 🏨 ☕ 🎶 🌅 📍 👨‍🍳 💎 🔥 etc.).${modeInstructions || (hasResults ? `
- Base-toi UNIQUEMENT sur les établissements fournis ci-dessous. Ne mentionne JAMAIS d'établissement qui n'est pas dans la liste.
- Cite jusqu'à 10 établissements de la liste par leur nom exact, en expliquant pourquoi ils correspondent à la recherche (ambiance, spécialités, vue, etc.).
- CRITIQUE : Écris chaque nom EXACTEMENT comme dans la liste fournie, caractère pour caractère (mêmes accents, majuscules, ponctuation). N'ajoute JAMAIS de suffixe, de ville, de quartier, de parenthèses, de tiret descriptif, ni d'article ("Le", "La", "Restaurant", etc.) qui ne figure pas dans le nom original. Pas de reformulation, pas de traduction du nom.
- Ne mentionne JAMAIS de note, score ou classement chiffré (pas de "/20", "/10", "étoiles", etc.).` : '')}${boostVerified && hasResults && !mode ? `\n- Les établissements marqués [CONFIANCE] sont des adresses de confiance. Privilégie-les dans ta réponse mais ne mentionne JAMAIS le mot "vérifié", "confiance", "[CONFIANCE]" ou tout badge similaire dans ta réponse.` : ''}${!mode ? noResultsInstructions : ''}
- Si la liste ne semble pas correspondre à la question, dis-le honnêtement.
- Entoure chaque nom de doubles astérisques, par exemple **Nom**.
- FORMATAGE : Utilise du markdown riche pour structurer ta réponse. Gras (**texte**), italique (*texte*), listes à puces (- item), listes numérotées (1. item), et sauts de paragraphe. Pas de titres (#). Structure bien ta réponse avec des paragraphes et des listes quand c'est pertinent.
- Commence par une phrase d'accroche engageante liée à la recherche, puis laisse DEUX lignes vides avant de continuer avec les recommandations.
- ${tone}
- Commence par une accroche engageante liée à la recherche de l'utilisateur.${extraInstructions ? `\n- ${extraInstructions}` : ''}${spokenText ? `\n- CONTEXTE IMPORTANT : L'utilisateur a dit textuellement : "${spokenText}". Utilise ce contexte pour mieux comprendre son intention réelle et ne recommande QUE les établissements qui correspondent à cette intention. Si certains établissements de la liste ne correspondent pas au contexte (mauvaise ville, mauvais type), ignore-les.` : ''}${vary ? `\n- IMPORTANT : L'utilisateur demande une suggestion DIFFÉRENTE (tentative #${vary}). Change l'angle d'approche, l'ordre de présentation, le style d'accroche et mets en avant des établissements différents ou des aspects différents. Sois créatif et surprenant.` : ''}${isRefinement ? `\n- AFFINEMENT : L'utilisateur précise sa recherche initiale avec un nouveau critère. Filtre STRICTEMENT la liste fournie pour ne citer QUE les établissements qui correspondent réellement à ce critère. Analyse TOUS les champs disponibles pour chaque établissement : nom, ville, quartier, adresse, sous-catégories, hook, Services, Engagements (RSE/certifications), Badges (badges de l'établissement) et Badges vidéos (thématiques des vidéos liées). Si le critère est un lieu (quartier, route, rue, avenue, secteur…), considère qu'un établissement correspond dès que ce lieu apparaît dans son adresse OU son quartier. Cite TOUS les établissements pertinents de la liste (jusqu'à 10), pas seulement 2 ou 3 — la liste fournie peut contenir jusqu'à 60 candidats. N'hésite PAS à re-citer un établissement déjà mentionné précédemment s'il correspond au nouveau critère — la pertinence prime sur la nouveauté. Si AUCUN établissement de la liste ne correspond clairement au critère, dis-le honnêtement plutôt que d'en citer qui ne correspondent pas. Ne cite jamais un établissement uniquement parce qu'il n'a pas encore été mentionné.` : ''}

${mode === "poi" ? "LIEUX D'INTÉRÊT" : mode === "destinations" ? "DESTINATIONS" : "ÉTABLISSEMENTS TROUVÉS"} :
${businessContext}${knowledgeContext ? `

CONNAISSANCES COMPLÉMENTAIRES (si pertinent, intègre ces informations de manière naturelle pour enrichir tes recommandations — ne mets pas en avant un établissement uniquement parce qu'il a une entrée ici) :
${knowledgeContext}` : ''}`;

    const effectiveTemperature = vary ? Math.min(temperature + 0.3, 1.5) : temperature;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...(Array.isArray(history)
            ? history
                .filter((m: any) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
                .slice(-10)
                .map((m: any) => ({ role: m.role, content: m.content }))
            : []),
          { role: "user", content: query },
        ],
        max_tokens: maxTokens,
        temperature: effectiveTemperature,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded", answer: "" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required", answer: "" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error(`AI gateway error [${response.status}]:`, errorText);
      return new Response(JSON.stringify({ answer: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const rawAnswer = data.choices?.[0]?.message?.content?.trim() ?? "";

    // Hard cleanup: never expose verification badges/wording or leaked prompt instructions
    const answer = rawAnswer
      .replace(/[^.!?\n]*✅\s*V[ée]rifi[ée]s?[^.!?\n]*[.!?]?/gi, "")
      .replace(/[^.!?\n]*\bV[ée]rifi[ée]s?\b[^.!?\n]*[.!?]?/gi, "")
      .replace(/\[\s*CONFIANCE\s*\]/gi, "")
      // Remove leaked prompt/formatting instructions
      .replace(/N['']?utilise pas d['']autre formatage markdown[^.!?\n]*[.!?]?/gi, "")
      .replace(/[ÉE]cris en texte simple avec [ée]mojis\.?[\s✨]*/gi, "")
      .replace(/Pas de (titres?|listes? [àa] puces?|#)[^.!?\n]*[.!?]?/gi, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([,.;!?])/g, "$1")
      .trim();

    console.log(`AI answer for "${query}": ${answer.substring(0, 100)}...`);

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI search answer error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", answer: "" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
