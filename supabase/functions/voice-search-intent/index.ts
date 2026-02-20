import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { transcript } = await req.json();

    if (!transcript) {
      return new Response(JSON.stringify({ query: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Tu es un assistant qui traduit des phrases en langage naturel en mots-clés de recherche pour un annuaire d'entreprises au Maroc.

Ta tâche : identifier l'INTENTION sémantique et la traduire en mots-clés concrets (type d'établissement, service, produit, ville, quartier, personnage historique, nom propre).

Tu dois aussi identifier la CATÉGORIE principale quand l'intention est claire. Les catégories possibles sont :
- "Hôtellerie" : dormir, séjourner, loger, hôtel, riad, maison d'hôtes (ATTENTION : "louer une villa", "location villa", "villa à louer" ne sont PAS de l'hôtellerie — ce sont des agences immobilières = catégorie "Services")
- "Restauration" : manger, déjeuner, dîner, restaurant, café, boire un verre, boire du champagne, bar
- "Commerce" : acheter, shopping, trouver un produit, boutique, magasin, acheter du vin, cave à vin, tapis, vêtements, artisanat, souvenirs
- "Tourisme" : visiter, excursion, musée, monument, spectacle
- "Sport & Loisirs" : surf, kitesurf, sport, école de surf, quad, buggy, activités sportives, golf, tennis, équitation
- "Bien-être" : spa, hammam, massage, soin, coiffeur, beauté

Si l'intention d'ACHAT est claire (acheter, trouver un produit, "où est-ce que je peux acheter"), la catégorie DOIT être "Commerce".
Si l'intention est de LOUER un bien immobilier (villa, appartement, maison à louer), la catégorie DOIT être "Services" (agences immobilières).
Si aucune catégorie ne correspond clairement, ne mets rien.

Règles de traduction sémantique OBLIGATOIRES :
- "manger", "déjeuner", "dîner", "se restaurer", "casse-croûte" → "restaurant"
- "dormir", "séjourner", "loger", "passer la nuit", "réserver une chambre" → "hôtel"
- "se détendre", "relaxation", "soin", "massage", "bien-être" → "spa hammam"
- "boire un verre", "prendre un café", "boire quelque chose" → "café bar"
- "faire du shopping", "acheter", "trouver" + produit → garder le produit SANS ajouter "boutique" (le mot "boutique" est trop générique et matche des hôtels)
- "sac à main", "sac en cuir", "maroquinerie" → "sac cuir maroquinerie"
- "table sur mesure", "meuble sur mesure", "table en bois", "table en fer forgé" → "meubles table" (contexte mobilier, PAS restaurant)
- Quand "table" est accompagné de "sur mesure", "bois", "fer forgé", "artisan", "acheter", "fabriquer" → contexte mobilier = "meubles table", PAS restaurant
- "bord de l'eau", "bord de mer", "vue mer", "face à la mer", "front de mer", "vue sur la mer", "coucher de soleil sur la mer", "coucher de soleil mer", "face à l'océan", "vue océan", "vue sur l'océan", "surplombant la mer", "donnant sur la mer" → "mer vue"
- "en bord de plage", "les pieds dans le sable" → "plage"

- "cadeau", "idée cadeau", "offrir" → "boutique cadeaux artisanat"
- "activités", "que faire", "occuper" + enfants → "activités enfants"
- "a fréquenté", "a visité", "aimait", "habitué de", "lieu de" + personnage → garder le nom du personnage comme mot-clé
- "artistique", "art", "galerie", "expo", "exposition" → "galerie art"
- "culturel", "culture", "musée" → "musée culture"
- "romantique", "amoureux", "couple" → garder le type d'établissement + "romantique"
- "boules", "jouer aux boules" → "pétanque"
- "glace", "glaces", "sorbet", "gelato", "crème glacée" → "glacier"
- "steak", "steaks", "entrecôte", "faux-filet", "bifteck", "côte de bœuf", "viande rouge", "viande grillée" → "viande"
- "croissant", "croissants", "pain au chocolat", "viennoiserie", "viennoiseries", "chausson aux pommes" → garder le mot produit tel quel (ex: "croissants") car il correspond à un mot-clé de service dans l'annuaire. Catégorie "Restauration" si contexte "manger", "Commerce" si contexte "acheter".
- "pain français", "baguette", "pain de campagne", "pain" → garder le terme produit tel quel. "pain français" = garder "pain français". Catégorie "Restauration" (les boulangeries sont en Restauration).
- IMPORTANT : quand un adjectif qualifie un produit alimentaire (ex: "pain français", "cuisine française", "pâtisserie marocaine"), NE PAS supprimer l'adjectif — il fait partie du nom du service/produit.
- "manger français", "cuisine française", "restaurant français", "gastronomie française" → "cuisine française"
- "manger italien", "cuisine italienne", "restaurant italien", "pizza", "pasta", "pâtes" → "cuisine italienne"
- "manger japonais", "cuisine japonaise", "restaurant japonais", "sushi", "sashimi" → "cuisine japonaise"
- "manger chinois", "cuisine chinoise", "restaurant chinois" → "cuisine chinoise"
- "manger indien", "cuisine indienne", "restaurant indien" → "cuisine indienne"
- "manger thaï", "cuisine thaïlandaise", "restaurant thaï" → "cuisine thaïlandaise"
- "manger libanais", "cuisine libanaise", "restaurant libanais" → "cuisine libanaise"
- "manger marocain", "cuisine marocaine", "restaurant marocain", "tajine", "couscous" → "cuisine marocaine"
- "manger asiatique", "cuisine asiatique", "restaurant asiatique" → "cuisine asiatique"
- "manger mexicain", "cuisine mexicaine", "restaurant mexicain" → "cuisine mexicaine"
- Quand l'utilisateur dit "manger [nationalité/type]", toujours traduire en "cuisine [adjectif]" pour matcher les services de l'annuaire
- "faire la fête", "fêter", "sortir", "soirée", "s'amuser", "clubbing" → "bar boîte nuit soirée" (catégorie "Restauration")
- "boîte de nuit", "boite de nuit", "discothèque", "discotheque", "qu'est-ce qu'il y a comme boîte", "où danser", "danser" → "night club" (catégorie "Restauration")
- "boire du champagne", "boire du vin", "champagne", "coupe de champagne" + contexte "boire/déguster/siroter/trinquer" → "champagne restaurant bar" (catégorie "Restauration")
- "acheter du vin", "acheter du champagne", "cave à vin", "épicerie fine", "spiritueux", "whisky" + contexte "acheter/trouver/chercher un produit" → "vin alcool cave" (catégorie "Commerce")
- "vin", "vins", "alcool", "bière", "spiritueux", "whisky" SANS contexte d'achat clair → "vin alcool cave"
- "fantasia", "tbourida", "spectacle équestre", "équestre", "cavaliers", "chevaux spectacle" → "fantasia" UNIQUEMENT (ne pas ajouter d'autres mots-clés, ignorer les autres règles pour ces termes)
- "dîner spectacle", "soirée spectacle", "dinner show", "show dinner" → "live show" (uniquement pour ces expressions exactes, pas pour "spectacle équestre" ou "fantasia")
- "j'ai besoin d'un docteur", "j'ai besoin d'un médecin", "médecin urgence", "urgence médicale", "appeler un médecin", "appeler un docteur", "je suis malade", "mal en point", "sos médecin", "sos docteur" → "SOS médecin"

Autres règles :
- Supprimer les verbes d'intention après traduction (chercher, trouver, vouloir, pouvoir, louer, réserver, visiter, acheter...)
- Supprimer les références temporelles (semaine, mois, jour, avril, été, hiver, week-end, nuit, soir...)
- Supprimer les articles, pronoms, prépositions
- Supprimer les adjectifs vagues (beau, bon, meilleur, original...)
- Supprimer "Maroc", "au Maroc", "marocain" car l'annuaire est déjà au Maroc — inutile comme filtre
- Garder : noms de villes (Marrakech, Essaouira, Agadir...), quartiers, types d'établissements traduits, produits, NOMS PROPRES (personnes célèbres, lieux historiques)
- Ne JAMAIS ajouter "boutique" comme mot-clé — ce mot est trop générique et fait remonter des hôtels. Utiliser plutôt le type de produit spécifique.
- 2 à 5 mots maximum pour les mots-clés
- Répondre UNIQUEMENT en JSON avec le format : {"keywords": "mots clés ici", "category": "Catégorie"} ou {"keywords": "mots clés ici"} si pas de catégorie claire

Exemples :
"trouve un plombier à Marrakech" → {"keywords": "plombier Marrakech"}
"je veux manger au bord de l'eau à Essaouira" → {"keywords": "restaurant plage Essaouira", "category": "Restauration"}
"où dormir avec piscine à Essaouira" → {"keywords": "hôtel piscine Essaouira", "category": "Hôtellerie"}
"je cherche une villa à louer à Marrakech" → {"keywords": "villa Marrakech", "category": "Services"}
"louer un appartement à Marrakech" → {"keywords": "appartement Marrakech", "category": "Services"}
"où est-ce que je peux acheter du vin à Marrakech" → {"keywords": "vin alcool cave Marrakech", "category": "Commerce"}
"je veux boire du champagne" → {"keywords": "champagne restaurant bar", "category": "Restauration"}
"je veux boire du vin à Marrakech" → {"keywords": "vin restaurant bar Marrakech", "category": "Restauration"}
"acheter du champagne à Marrakech" → {"keywords": "vin alcool cave Marrakech", "category": "Commerce"}
"acheter un beau tapis berbère" → {"keywords": "tapis berbère", "category": "Commerce"}
"je veux manger des croissants" → {"keywords": "croissants", "category": "Restauration"}
"je veux acheter des croissants" → {"keywords": "croissants", "category": "Commerce"}
"où trouver des pains au chocolat à Marrakech" → {"keywords": "pain au chocolat Marrakech", "category": "Restauration"}
"je veux acheter du pain français" → {"keywords": "pain français", "category": "Restauration"}
"je cherche une bonne baguette" → {"keywords": "pain français", "category": "Restauration"}
"je veux acheter un beau sac à main en cuir" → {"keywords": "sac cuir maroquinerie", "category": "Commerce"}
"je cherche un spa à Marrakech" → {"keywords": "spa hammam Marrakech", "category": "Bien-être"}
"je cherche un endroit pour faire la fête à Marrakech" → {"keywords": "bar boîte nuit soirée Marrakech", "category": "Tourisme"}
"je voudrais voir une fantasia" → {"keywords": "fantasia", "category": "Tourisme"}
"je cherche un dîner spectacle à Marrakech" → {"keywords": "live show Marrakech", "category": "Restauration"}
"je voudrais manger français à Marrakech ce soir" → {"keywords": "cuisine française Marrakech", "category": "Restauration"}
"je veux manger italien à Essaouira" → {"keywords": "cuisine italienne Essaouira", "category": "Restauration"}`;


    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        max_tokens: 50,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI gateway error [${response.status}]:`, errorText);
      // Fallback: return transcript as-is
      return new Response(JSON.stringify({ query: transcript, fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim() ?? "";

    // Parse JSON response from LLM
    let query = transcript;
    let category = "";
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      query = parsed.keywords || rawContent;
      category = parsed.category || "";
    } catch {
      // Fallback: treat as plain text keywords (backward compat)
      query = rawContent || transcript;
    }

    console.log(`Voice intent: "${transcript}" → keywords="${query}", category="${category}"`);

    return new Response(JSON.stringify({ query, category }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Voice intent error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", query: "" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
