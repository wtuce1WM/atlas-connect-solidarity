import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertAllowedOrigin } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const originCheck = assertAllowedOrigin(req, corsHeaders);
  if (originCheck instanceof Response) return originCheck;

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

    const today = new Date().toISOString().split("T")[0];
    const systemPrompt = `Tu es un assistant qui traduit des phrases en langage naturel en mots-clés de recherche pour un annuaire d'entreprises au Maroc.

Ta tâche : identifier l'INTENTION sémantique et la traduire en mots-clés concrets (type d'établissement, service, produit, ville, quartier, personnage historique, nom propre).

INTENTION SPÉCIALE — RECHERCHE D'HÔTELS PAR VILLE (sans nom précis) :
Si l'utilisateur cherche un hôtel/riad/maison d'hôtes DANS UNE VILLE **ET mentionne EXPLICITEMENT des DATES** (sans nommer un établissement précis ET sans qualificatif de service comme piscine, spa, vue mer, rooftop, hammam, etc.), réponds avec :
{"intent": "hotelSearch", "city": "Ville", "checkIn": "YYYY-MM-DD", "checkOut": "YYYY-MM-DD", "adults": 2}
- Déclencheurs : "hôtel à [ville] **du X au Y**", "trouve un hôtel à [ville] **pour ce week-end**", "réserver un hôtel à [ville] **demain**", "hotel in [city] **from X to Y**"
- Date actuelle : ${today}. Résoudre les dates relatives. Si checkIn donné sans checkOut, mettre checkOut = checkIn + 1 jour.
- **SI AUCUNE DATE EXPLICITE N'EST DONNÉE → NE PAS utiliser hotelSearch. Utiliser le format keywords classique.**
- **SI L'UTILISATEUR AJOUTE UN QUALIFICATIF (piscine, spa, vue mer, rooftop, romantique, pas cher, luxe, hammam, jardin, etc.) → NE PAS utiliser hotelSearch. Utiliser le format keywords classique.**
- adults par défaut 2.
- IMPORTANT : si l'utilisateur nomme un établissement précis → utilise hotelAvailability à la place.

Exemples hotelSearch (dates explicites + pas de qualificatif) :
"Trouve un hôtel à Marrakech du 10 au 15 mars" → {"intent": "hotelSearch", "city": "Marrakech", "checkIn": "2026-03-10", "checkOut": "2026-03-15", "adults": 2}
"Hôtel à Essaouira ce week-end" → {"intent": "hotelSearch", "city": "Essaouira", "checkIn": "...", "checkOut": "..."}

Exemples NON hotelSearch (à traiter en keywords classiques) :
"hôtel avec piscine à Marrakech" → {"keywords": "hôtel piscine Marrakech", "category": "Hôtellerie"}
"hôtel à Marrakech" (pas de date) → {"keywords": "hôtel Marrakech", "category": "Hôtellerie"}
"riad pas cher à Fès" → {"keywords": "riad Fès", "category": "Hôtellerie"}

INTENTION SPÉCIALE — RECHERCHE DE VOL :
Si l'utilisateur cherche un vol/billet d'avion, réponds avec ce JSON :
{"intent": "flightSearch", "origin": "Ville d'origine ou code IATA", "destination": "Ville d'arrivée ou code IATA", "departureDate": "YYYY-MM-DD", "returnDate": "YYYY-MM-DD", "adults": 1}
- Déclencheurs : "vol", "billet d'avion", "voler", "prendre l'avion", "flight", "ticket", "fly to"
- "origin" peut être omis si l'utilisateur ne le précise pas (la géoloc sera utilisée côté client)
- Résoudre les dates relatives (la date actuelle est ${today}). returnDate optionnel.
- adults par défaut 1 si non précisé.

Exemples flightSearch :
"Je veux un vol pour Marrakech le 10 mars" → {"intent": "flightSearch", "destination": "Marrakech", "departureDate": "2026-03-10"}
"Vol Paris Casablanca du 5 au 12 avril 2 adultes" → {"intent": "flightSearch", "origin": "Paris", "destination": "Casablanca", "departureDate": "2026-04-05", "returnDate": "2026-04-12", "adults": 2}
"Flight to Agadir next week" → {"intent": "flightSearch", "destination": "Agadir"}

INTENTION SPÉCIALE — RECHERCHE WEB :
Si l'utilisateur pose une question générale qui ne correspond ni à l'annuaire (établissements au Maroc), ni à un hôtel disponible, ni à un vol — typiquement une question de connaissance générale, actualité, météo, conversion, recherche d'information sur le web — réponds avec :
{"intent": "webSearch", "query": "requête nettoyée pour Google"}
- Déclencheurs : "cherche sur Google", "google", "search the web", "qui est", "qu'est-ce que", "quelle est la météo", "convertir", "actualité", "news"
- N'utilise PAS webSearch si la requête concerne clairement un établissement, restaurant, hôtel, activité au Maroc — utilise le format keywords classique.

Exemples webSearch :
"Cherche sur Google la météo à Marrakech demain" → {"intent": "webSearch", "query": "météo Marrakech demain"}
"Qui est le roi du Maroc" → {"intent": "webSearch", "query": "roi du Maroc"}
"Convertir 100 euros en dirhams" → {"intent": "webSearch", "query": "100 EUR to MAD"}

INTENTION SPÉCIALE — DISPONIBILITÉ HÔTELIÈRE :
Si l'utilisateur demande la DISPONIBILITÉ d'un hôtel/riad/maison d'hôtes spécifique (par son nom), tu dois répondre avec un JSON spécial :
{"intent": "hotelAvailability", "hotelName": "Nom de l'hôtel", "checkIn": "YYYY-MM-DD", "checkOut": "YYYY-MM-DD", "adults": 2, "rooms": 1}
- Extraire le nom de l'établissement tel que dicté
- Extraire les dates si mentionnées. La date actuelle est ${today}. Résoudre les dates relatives (demain, semaine prochaine, du 10 au 15 mars, etc.)
- Si checkIn est donné mais pas checkOut, mettre checkOut = checkIn + 1 jour
- Extraire le nombre d'adultes si mentionné (sinon omettre)
- Extraire le nombre de chambres si mentionné (sinon omettre)
- Déclencheurs : "disponible", "disponibilité", "dispo", "est-ce que X est disponible", "réserver au X", "chambres au X", "il y a de la place au X", "vérifier la dispo", "available", "book", "availability", "check availability"
- IMPORTANT : cette intention ne s'applique QUE quand un NOM D'ÉTABLISSEMENT SPÉCIFIQUE est mentionné. "Je cherche un hôtel disponible" → recherche classique, PAS hotelAvailability.

Exemples hotelAvailability :
"Est-ce que le Villa Makassar est disponible du 10 au 15 mars ?" → {"intent": "hotelAvailability", "hotelName": "Villa Makassar", "checkIn": "2026-03-10", "checkOut": "2026-03-15"}
"Réserver au Royal Mansour pour 3 adultes" → {"intent": "hotelAvailability", "hotelName": "Royal Mansour", "adults": 3}
"Dispo au Riad Kniza du 20 au 25 avril 2 chambres" → {"intent": "hotelAvailability", "hotelName": "Riad Kniza", "checkIn": "2026-04-20", "checkOut": "2026-04-25", "rooms": 2}
"Is the Mamounia available?" → {"intent": "hotelAvailability", "hotelName": "La Mamounia"}

Pour TOUTES les autres requêtes, continue avec le format habituel ci-dessous.

RÈGLE ABSOLUE — FIDÉLITÉ AU TRANSCRIPT :
- Tu ne dois JAMAIS inventer, ajouter ou inférer des mots qui ne sont PAS dans le transcript original.
- Si l'utilisateur dit "pizza", tu gardes "pizza". Tu ne dois PAS ajouter "cuisine italienne" sauf si l'utilisateur dit explicitement "italien" ou "italienne".
- Si l'utilisateur dit "feu de bois", tu gardes "feu bois". Tu ne dois PAS ajouter "viande" sauf si l'utilisateur mentionne de la viande.
- Si l'utilisateur dit "sushi", tu gardes "sushi". Tu ne dois PAS ajouter "cuisine japonaise".
- Les règles de traduction ci-dessous ne s'appliquent QUE quand l'utilisateur utilise les mots exacts listés (ex: "manger italien" → "cuisine italienne"). Un plat spécifique (pizza, sushi, tajine) doit être gardé TEL QUEL.

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

RÈGLE CRITIQUE sur l'attribution de catégorie :
- Une catégorie ne doit être attribuée QUE si l'utilisateur exprime une INTENTION claire (verbe d'action ou contexte explicite).
- Un simple nom de produit/ingrédient SANS verbe d'intention (manger, acheter, chercher, trouver, boire, dormir...) NE DOIT PAS recevoir de catégorie.
- Exemples SANS catégorie : "langouste Marrakech", "tapis Essaouira", "sushi Casablanca", "homard Agadir"
- Exemples AVEC catégorie : "manger de la langouste à Marrakech" → Restauration, "acheter de la langouste à Marrakech" → Commerce

Règles de traduction sémantique OBLIGATOIRES :
- "manger", "déjeuner", "dîner", "se restaurer", "casse-croûte" → "restaurant"
- "dormir", "séjourner", "loger", "passer la nuit", "réserver une chambre" → "hôtel"
- "se détendre", "relaxation", "soin", "bien-être" → "spa hammam"
- "massage" → garder "massage" tel quel (ne PAS remplacer par "spa hammam" — "massage" est un mot-clé de service dans l'annuaire)
- "massage à domicile" → "massage domicile"
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
- "salade de [ingrédient]" (ex: "salade de pissenlit", "salade de chèvre", "salade de fruits de mer") → garder UNIQUEMENT l'ingrédient spécifique (ex: "pissenlit", "chèvre", "fruits mer"). Le mot "salade" est trop générique et noie les résultats. Exception : "salade" seul sans ingrédient → garder "salade".
- "steak", "steaks" → "steak" (garder tel quel)
- "entrecôte" → "entrecôte" (garder tel quel)
- "faux-filet" → "faux-filet" (garder tel quel)
- "bifteck" → "bifteck" (garder tel quel)
- "côte de bœuf" → "côte bœuf" (garder tel quel, juste supprimer "de")
- "osso bucco" → "osso bucco" (garder tel quel)
- "viande rouge", "viande grillée", "viande" (terme générique seul) → "viande"
- "feu de bois", "au feu de bois", "braise", "grillé au feu de bois", "cuit au feu de bois" → "feu bois" (garder les mots pour matcher le service "Au feu de bois", ne PAS ajouter "viande" sauf si l'utilisateur mentionne explicitement de la viande)
- "croissant", "croissants", "pain au chocolat", "viennoiserie", "viennoiseries", "chausson aux pommes" → garder le mot produit tel quel (ex: "croissants") car il correspond à un mot-clé de service dans l'annuaire. Catégorie "Restauration" si contexte "manger", "Commerce" si contexte "acheter".
- "pain français", "baguette", "pain de campagne", "pain" → garder le terme produit tel quel. "pain français" = garder "pain français". Catégorie "Restauration" (les boulangeries sont en Restauration).
- IMPORTANT : quand un adjectif qualifie un produit alimentaire (ex: "pain français", "cuisine française", "pâtisserie marocaine"), NE PAS supprimer l'adjectif — il fait partie du nom du service/produit.
- "manger français", "cuisine française", "restaurant français", "gastronomie française" → "cuisine française"
- "manger italien", "cuisine italienne", "restaurant italien" → "cuisine italienne"
- ATTENTION : "pizza", "pasta", "pâtes" → garder tel quel ("pizza", "pasta"). NE PAS remplacer par "cuisine italienne". Le mot-clé spécifique est plus précis.
- "manger japonais", "cuisine japonaise", "restaurant japonais" → "cuisine japonaise"
- ATTENTION : "sushi", "sashimi", "ramen" → garder tel quel. NE PAS remplacer par "cuisine japonaise".
- "manger chinois", "cuisine chinoise", "restaurant chinois" → "cuisine chinoise"
- "manger indien", "cuisine indienne", "restaurant indien" → "cuisine indienne"
- "manger thaï", "cuisine thaïlandaise", "restaurant thaï" → "cuisine thaïlandaise"
- "manger libanais", "cuisine libanaise", "restaurant libanais" → "cuisine libanaise"
- "manger marocain", "cuisine marocaine", "restaurant marocain", "tajine", "couscous" → "cuisine marocaine"
- "manger asiatique", "cuisine asiatique", "restaurant asiatique" → "cuisine asiatique"
- "manger mexicain", "cuisine mexicaine", "restaurant mexicain" → "cuisine mexicaine"
- Quand l'utilisateur dit "manger [nationalité/type]", toujours traduire en "cuisine [adjectif]" pour matcher les services de l'annuaire
- MAIS quand l'utilisateur mentionne un PLAT spécifique (pizza, sushi, tajine, couscous, burger, tacos...), garder le nom du plat tel quel
- "faire la fête", "fêter", "sortir", "soirée", "s'amuser", "clubbing" → "bar boîte nuit soirée" (catégorie "Restauration")
- "boîte de nuit", "boite de nuit", "discothèque", "discotheque", "qu'est-ce qu'il y a comme boîte", "où danser", "danser" → "night club" (catégorie "Restauration")
- "boire du champagne", "coupe de champagne" + contexte "boire/déguster/siroter/trinquer" → "champagne" (catégorie "Restauration")
- "boire du vin", "déguster du vin", "bon vin", "très bon vin" → "vin cave à vin" (catégorie "Restauration")
- "acheter du vin", "acheter du champagne", "cave à vin", "épicerie fine", "spiritueux", "whisky" + contexte "acheter/trouver/chercher un produit" → "vin cave" (catégorie "Commerce")
- "vin", "vins", "alcool", "bière", "spiritueux", "whisky" SANS contexte d'achat clair → "vin cave à vin"
- "fantasia", "tbourida", "spectacle équestre", "équestre", "cavaliers", "chevaux spectacle" → "fantasia" UNIQUEMENT (ne pas ajouter d'autres mots-clés, ignorer les autres règles pour ces termes)
- "dîner spectacle", "soirée spectacle", "dinner show", "show dinner" → "live show" (uniquement pour ces expressions exactes, pas pour "spectacle équestre" ou "fantasia")
- "spectacle", "show", "show live", "attraction", "concert", "live music", "musique live" → "live show" (catégorie "Tourisme"). Quand plusieurs de ces synonymes apparaissent ensemble, NE PAS les empiler — consolider en "live show" uniquement. Si un genre musical est mentionné (jazz, rock, gnawa...), ajouter UNIQUEMENT le genre : "live show jazz". Le mot "concert" est redondant avec le genre et doit être supprimé.
- "j'ai besoin d'un docteur", "j'ai besoin d'un médecin", "médecin urgence", "urgence médicale", "appeler un médecin", "appeler un docteur", "je suis malade", "mal en point", "sos médecin", "sos docteur" → "SOS médecin"
- "taxi", "taxi aéroport", "transfert aéroport", "navette aéroport", "je cherche un taxi", "taxi pour l'aéroport" → "taxi chauffeur privé" + ville si mentionnée (catégorie "Transport")
- "piscine" → garder "piscine" tel quel
- "bar" → garder "bar" tel quel

Autres règles :
- Supprimer les verbes d'intention après traduction (chercher, trouver, vouloir, pouvoir, louer, réserver, visiter, acheter...)
- Supprimer les références temporelles (semaine, mois, jour, avril, été, hiver, week-end...)
- IMPORTANT : NE PAS supprimer les mots temporels suivants, les inclure dans un champ "timeKeyword" : matin, midi, déjeuner, dîner, diner, soir, soirée, nuit, maintenant, ouvert, petit-déjeuner, brunch, apéro, goûter, après-midi, demain, ce soir, tonight, now, open, morning, evening, afternoon, lunch, dinner, breakfast
- Supprimer les articles, pronoms, prépositions
- Supprimer les adjectifs vagues (beau, bon, meilleur, original...)
- Supprimer "Maroc", "au Maroc", "marocain" car l'annuaire est déjà au Maroc — inutile comme filtre
- Garder : noms de villes (Marrakech, Essaouira, Agadir...), quartiers, types d'établissements traduits, produits, NOMS PROPRES (personnes célèbres, lieux historiques)
- Ne JAMAIS ajouter "boutique" comme mot-clé — ce mot est trop générique et fait remonter des hôtels. Utiliser plutôt le type de produit spécifique.
- 2 à 5 mots maximum pour les mots-clés
- Répondre UNIQUEMENT en JSON avec le format : {"keywords": "mots clés ici", "category": "Catégorie", "timeKeyword": "midi"} ou {"keywords": "mots clés ici"} si pas de catégorie/temps clair
- Le champ "timeKeyword" doit contenir le mot temporel détecté en français (midi, soir, matin, nuit, maintenant, demain matin, demain soir, brunch, etc.) ou être omis si aucun

Exemples :
"trouve un plombier à Marrakech" → {"keywords": "plombier Marrakech"}
"je veux manger au bord de l'eau à Essaouira" → {"keywords": "restaurant plage Essaouira", "category": "Restauration"}
"où dormir avec piscine à Essaouira" → {"keywords": "hôtel piscine Essaouira", "category": "Hôtellerie"}
"je cherche une villa à louer à Marrakech" → {"keywords": "villa Marrakech", "category": "Services"}
"louer un appartement à Marrakech" → {"keywords": "appartement Marrakech", "category": "Services"}
"où est-ce que je peux acheter du vin à Marrakech" → {"keywords": "vin alcool cave Marrakech", "category": "Commerce"}
"je veux boire du champagne" → {"keywords": "champagne", "category": "Restauration"}
"je veux boire du vin à Marrakech" → {"keywords": "vin cave à vin Marrakech", "category": "Restauration"}
"je veux boire un très bon vin à Marrakech" → {"keywords": "vin cave à vin Marrakech", "category": "Restauration"}
"acheter du champagne à Marrakech" → {"keywords": "vin cave Marrakech", "category": "Commerce"}
"acheter un beau tapis berbère" → {"keywords": "tapis berbère", "category": "Commerce"}
"je veux manger des croissants" → {"keywords": "croissants", "category": "Restauration"}
"je veux acheter des croissants" → {"keywords": "croissants", "category": "Commerce"}
"où trouver des pains au chocolat à Marrakech" → {"keywords": "pain au chocolat Marrakech", "category": "Restauration"}
"je veux acheter du pain français" → {"keywords": "pain français", "category": "Restauration"}
"je cherche une bonne baguette" → {"keywords": "pain français", "category": "Restauration"}
"je veux acheter un beau sac à main en cuir" → {"keywords": "sac cuir maroquinerie", "category": "Commerce"}
"je cherche un spa à Marrakech" → {"keywords": "spa hammam Marrakech", "category": "Bien-être"}
"je cherche un massage à domicile à hivernage" → {"keywords": "massage domicile hivernage", "category": "Bien-être"}
"je cherche un endroit pour faire la fête à Marrakech" → {"keywords": "bar boîte nuit soirée Marrakech", "category": "Tourisme"}
"je voudrais voir une fantasia" → {"keywords": "fantasia", "category": "Tourisme"}
"je cherche un dîner spectacle à Marrakech" → {"keywords": "live show Marrakech", "category": "Restauration"}
"je voudrais manger français à Marrakech ce soir" → {"keywords": "cuisine française Marrakech", "category": "Restauration", "timeKeyword": "soir"}
"je veux manger italien à Essaouira" → {"keywords": "cuisine italienne Essaouira", "category": "Restauration"}
"je veux manger une pizza à Marrakech" → {"keywords": "pizza Marrakech", "category": "Restauration"}
"je veux manger une pizza cuite au feu de bois à Marrakech" → {"keywords": "pizza feu bois Marrakech", "category": "Restauration"}
"je veux manger des sushis à Casablanca" → {"keywords": "sushi Casablanca", "category": "Restauration"}
"je cherche une piscine avec un bar pour faire la fête demain après-midi à Marrakech" → {"keywords": "piscine bar Marrakech", "category": "Sport & Loisirs", "timeKeyword": "après-midi"}
"un restaurant ouvert maintenant" → {"keywords": "restaurant", "category": "Restauration", "timeKeyword": "maintenant"}
"où manger à midi à Marrakech" → {"keywords": "restaurant Marrakech", "category": "Restauration", "timeKeyword": "midi"}
"un bon brunch demain" → {"keywords": "brunch", "category": "Restauration", "timeKeyword": "brunch"}
"petit déjeuner à Essaouira" → {"keywords": "petit-déjeuner Essaouira", "category": "Restauration", "timeKeyword": "petit-déjeuner"}`;

    // Fetch override rules from DB and append to prompt
    let finalPrompt = systemPrompt;
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      if (supabaseUrl && supabaseKey) {
        const sb = createClient(supabaseUrl, supabaseKey);
        const { data: overrides } = await sb
          .from("voice_intent_rules")
          .select("rule_text")
          .eq("is_active", true)
          .order("sort_order");
        if (overrides && overrides.length > 0) {
          const overrideBlock = overrides.map((r: { rule_text: string }) => `- ${r.rule_text}`).join("\n");
          finalPrompt += `\n\nRÈGLES ADDITIONNELLES (overrides prioritaires) :\n${overrideBlock}`;
        }
      }
    } catch (e) {
      console.error("Failed to fetch voice_intent_rules overrides:", e);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: finalPrompt },
          { role: "user", content: transcript },
        ],
        max_tokens: 120,
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
    let timeKeyword = "";
    let intent = "";
    let hotelAvailability: Record<string, unknown> | null = null;
    let flightSearch: Record<string, unknown> | null = null;
    let webSearch: Record<string, unknown> | null = null;
    let hotelSearch: Record<string, unknown> | null = null;
    try {
      const parsed = JSON.parse(rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      
      if (parsed.intent === "hotelAvailability") {
        intent = "hotelAvailability";
        hotelAvailability = {
          hotelName: parsed.hotelName || "",
          checkIn: parsed.checkIn || undefined,
          checkOut: parsed.checkOut || undefined,
          adults: parsed.adults || undefined,
          rooms: parsed.rooms || undefined,
        };
        query = parsed.hotelName || transcript;
        console.log(`Voice intent: hotelAvailability for "${parsed.hotelName}"`);
      } else if (parsed.intent === "hotelSearch") {
        intent = "hotelSearch";
        hotelSearch = {
          city: parsed.city || "",
          checkIn: parsed.checkIn || undefined,
          checkOut: parsed.checkOut || undefined,
          adults: parsed.adults || 2,
        };
        query = parsed.city || transcript;
        console.log(`Voice intent: hotelSearch in "${parsed.city}"`);
      } else if (parsed.intent === "flightSearch") {
        intent = "flightSearch";
        flightSearch = {
          origin: parsed.origin || undefined,
          destination: parsed.destination || "",
          departureDate: parsed.departureDate || undefined,
          returnDate: parsed.returnDate || undefined,
          adults: parsed.adults || 1,
        };
        query = `${parsed.origin || ""} ${parsed.destination || ""}`.trim() || transcript;
        console.log(`Voice intent: flightSearch ${parsed.origin || "?"} -> ${parsed.destination}`);
      } else if (parsed.intent === "webSearch") {
        intent = "webSearch";
        webSearch = { query: parsed.query || transcript };
        query = parsed.query || transcript;
        console.log(`Voice intent: webSearch "${parsed.query}"`);
      } else {
        query = parsed.keywords || rawContent;
        category = parsed.category || "";
        timeKeyword = parsed.timeKeyword || "";
      }
    } catch {
      query = rawContent || transcript;
    }

    console.log(`Voice intent: "${transcript}" → intent="${intent}", keywords="${query}", category="${category}", timeKeyword="${timeKeyword}"`);

    return new Response(JSON.stringify({ query, category, timeKeyword, intent, hotelAvailability, hotelSearch, flightSearch, webSearch }), {
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
