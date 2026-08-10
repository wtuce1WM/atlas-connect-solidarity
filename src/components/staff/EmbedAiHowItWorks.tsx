import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Zap, Route, Wand2, Database, MapPin, MessageSquare, Sparkles, ShieldCheck, History } from "lucide-react";

export default function EmbedAiHowItWorks() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <BookOpen className="h-6 w-6 text-primary mt-1" />
        <div>
          <h2 className="text-xl font-bold">Fonctionnement du Chat IA Embed</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Comment l'assistant intégré chez les affiliés (<code>/embed/ask/:slug</code>) répond aux visiteurs. Vue d'ensemble sans langue de bois.
          </p>
        </div>
      </div>

      {/* Principe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> Principe général
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>
            L'assistant embed est <b>hébergé chez l'établissement affilié</b> (ex. Riad Dar Najat) mais interroge le catalogue complet One World Morocco. Il ne pousse pas l'établissement hôte : il répond au visiteur avec des <b>adresses One World Morocco</b>, en donnant priorité, quand c'est pertinent, à ce que le partenaire a ciblé (suggestions/relances) ou à sa proximité géographique.
          </p>
          <p>
            La règle d'or : <b>route déterministe d'abord, classifieur ensuite, génération en dernier</b> — c'est la matrice <b>A / B / C</b> partagée par les 3 surfaces (<code>/club</code>, <code>/embed/ask</code>, onglet IA de <code>/search</code>) :
            <b>Classe A</b> = 0 token (routes déterministes, réponses figées, contenus curatés) ; <b>Classe B</b> = un appel classifieur court qui choisit une route déterministe pour une intention ambiguë ; <b>Classe C</b> = synthèse générative, uniquement quand A et B échouent.
            Le modèle unique est <b>openai/gpt-5.6-sol</b> via Lovable AI Gateway (aucun modèle par route).
          </p>
        </CardContent>
      </Card>

      {/* Cycle de vie */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Route className="h-4 w-4 text-primary" /> Cycle d'une conversation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <b>Ouverture</b> : à l'arrivée sur <code>/embed/ask/:slug</code>, le front charge l'établissement hôte (nom, coordonnées, ville, url_6_title éventuel) et les <b>suggestions</b> (table unifiée <code>ai_suggestions</code>, <code>surface = 'embed'</code>) filtrées par ville hôte <b>et par catégorie principale de l'hôte</b>. Les articles de blog propriétaires puis les articles génériques récents s'affichent en dessous.
            </li>
            <li>
              <b>Clic sur suggestion</b> ou saisie libre → un POST est envoyé à l'edge function <code>embed-ai-chat</code> (V1) ou <code>embed-ai-chat-v2</code> (moteur unifié A/B/C, forçable par <code>?engine=v2</code>) avec : le message, l'ID de la suggestion, l'ID de la relance éventuelle, l'ID de l'hôte, la langue détectée, le thread persisté (localStorage + table <code>ai_chats</code>).
            </li>
            <li>
              <b>Routage</b> côté edge function : d'abord l'<b>autorité curatée</b> (article de blog lié, réponse figée, commodités ciblées → Classe A), puis la détection d'intention (regex FR/EN/AR) + mode forcé de la suggestion, puis le <b>classifieur</b> (Classe B) pour les intentions ambiguës. La 1ère autorité qui match gagne, le générateur (Classe C) reste le dernier recours. Le résultat est <b>streamé en SSE</b> (delta par delta) vers le navigateur.
            </li>
            <li>
              <b>Rendu</b> : texte markdown + marqueurs cachés (<code>{`<!--SHOW_ON_MAP-->`}</code>, <code>{`<!--KNOWN_BUSINESSES-->`}</code>, <code>{`<!--EVENTS_SNAPSHOT-->`}</code>, <code>{`<!--PINNED_BUSINESS_CARDS-->`}</code>, <code>{`<!--WEATHER_FORECAST-->`}</code>, <code>{`<!--DESTINATION_CARDS-->`}</code>, <code>{`<!--ARTICLE_CARD-->`}</code>) que le front transforme en carousel, carte Google, cartes météo, cartes destinations, etc.
            </li>
            <li>
              <b>Suite de conversation</b> : les <b>relances</b> configurées pour la suggestion s'affichent en pills sous la réponse, ainsi que les pills « élargir la recherche » et « nouvelle conversation ». Chaque tour est réinjecté dans le prochain appel (thread complet).
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Routes déterministes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" /> Routes déterministes (sans LLM)
          </CardTitle>
          <p className="text-xs text-muted-foreground pt-1">
            Chaque route est un bloc de code figé qui interroge la base et renvoie une réponse structurée. Elle est déclenchée par des regex sur le message (ou par le <b>mode forcé</b> de la suggestion). Testées dans cet ordre :
          </p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <ul className="space-y-2">
            <RouteItem name="Autorité curatée (Classe A)" desc="Articles de blog liés explicitement, réponses figées FR/EN/AR, commodity_filters (champ engagements, préfixe Logistique:) — corpus fermé, ordre éditorial préservé (order: given), zéro token." />
            <RouteItem name="Mode forcé — Events" desc="Force search_events sur la ville hôte + prochain week-end. Filtre par badges de la suggestion ou fallback #Agenda." />
            <RouteItem name="Mode forcé — Structure du Front" desc="Force search_businesses ville hôte avec sous-catégories + badges de la suggestion. Bypass LLM." />
            <RouteItem name="Mode forcé — Direct viewer" desc="Affiche uniquement les business_ids ciblés, dans l'ordre défini, en carousel figé." />
            <RouteItem name="Two-entity proximity (A/B)" desc="Ex. « piscine à côté d'un golf ». Combine 2 jeux de sous-catégories/badges A et B, filtre A par proximité à un B." />
            <RouteItem name="Nearby overview" desc="« Que faire à proximité ? » — recense toutes les catégories dans un rayon (1km par défaut, expansion progressive)." />
            <RouteItem name="Proximity filter (priors)" desc="« à proximité de {hôte} » sur résultats précédents — trie par distance sans re-recherche." />
            <RouteItem name="Neighborhood filter/broaden" desc="« à gueliz » — filtre les priors OU relance une recherche taxonomique dans un autre quartier détecté (typo-tolérant)." />
            <RouteItem name="Engagement filter (priors / city-wide)" desc="« livraison glovo », « vegan », « wifi »… — matche sur le champ engagements des priors ou de toute la ville." />
            <RouteItem name="Hours / Booking / Weather" desc="« Consulter les horaires », « Réserver en ligne », « Météo » — lit opening_hours (heure Maroc), scanne url_1 à url_5 pour un CTA de réservation, appelle Open-Meteo pour la météo." />
            <RouteItem name="Describe priors" desc="« Détaille les types de cuisine » — narre chaque prior (hook + description + résumé de carte) avec meta compacte (rating/20, distance, ouvert/fermé, service par défaut, menu/flipbook)." />
            <RouteItem name="Rankings" desc="Distance ranking (« le plus proche »), rating ranking (« le mieux noté »), ordinal pick (« le 2ème »), open filter (« ouvert maintenant »), count priors (« combien »)." />
            <RouteItem name="Destinations" desc="« Excursions d'une journée » — liste les destinations dans un rayon donné + slidepanel dédié." />
            <RouteItem name="Blog article route" desc="Si la demande matche un titre d'article (similarité fuzzy), affiche l'article inline : hook, TL;DR, intro, googlemap, résultats classés selon le blog." />
            <RouteItem name="Map replay" desc="« Sur une carte » — re-émet les marqueurs SHOW_ON_MAP des résultats précédents sans re-calcul." />
            <RouteItem name="Language / out-of-scope / anaphora" desc="Détection langue (FR/EN/AR), refus poli hors périmètre (politique, médical…), résolution de « il/elle/ce lieu » vers le dernier résultat cité." />
          </ul>
        </CardContent>
      </Card>

      {/* Sources de données */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-primary" /> Sources de données
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed">
          <p><b>businesses</b> : catalogue actif (is_active + closure_message null), 180 colonnes dont hook_fr/en/ar, description, images, logo_url, engagements, opening_hours, is_open_24h, vacation_dates, computed_rating, total_review_count, url_1 à url_6 (CTA + titres), main_category, categories, latitude/longitude, min_price/manual_price_range.</p>
          <p><b>subcategories + badges + services</b> : filtres taxonomiques posés par la suggestion, résolus en IDs avant la requête <code>search_businesses</code>.</p>
          <p><b>events</b> : agenda daté, filtré par ville hôte + fenêtre « prochain week-end », avec business lié affiché en préfixe cliquable.</p>
          <p><b>business_menu_summaries</b> : résumés de cartes (utilisés dans <code>describe_priors</code> + détection cuisines).</p>
          <p><b>reviews</b> : avis clients agrégés dans <code>computed_rating</code> (note /20) et <code>total_review_count</code>. L'avis par défaut (is_default=true, is_hidden=false) est traduit FR/EN/AR et affiché sur les pinned cards.</p>
          <p><b>blog_posts</b> : titres, hooks, TL;DR, intros, sous-catégories/badges de curation utilisés pour la route Blog article.</p>
          <p><b>ai_chats</b> : persistance serveur des threads (7 jours localStorage + trace DB). Chaque tour loggue <code>toolsCalledLog</code> pour le dashboard IA.</p>
        </CardContent>
      </Card>

      {/* Suggestions / Relances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" /> Rôle des Suggestions & Relances
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed">
          <p>
            Une <b>Suggestion</b> (table unifiée <code>ai_suggestions</code>, colonne <code>surface</code>) = un pill cliquable en haut de l'assistant. Elle porte : label (FR/EN/AR), ville de diffusion, <b>catégories principales ciblées</b>, sous-catégories, badges, <b>commodités ciblées</b>, business_ids ciblés (pinned), destinations ciblées, articles de blog liés, prompt personnalisé, réponse figée, mode forcé (Auto / Events / Structure du Front / Direct viewer / Proximité A-B). Le backoffice est unique : <i>Moteur IA → Suggestions & relances</i>, avec un sélecteur de surface.
          </p>
          <p>
            Une <b>Relance</b> (table unifiée <code>ai_followups</code>) = un pill affiché après la 1ère réponse IA. Elle porte : label multilingue, rayon en km (optionnel), mode forcé (Auto / POI seulement / Météo), ville, catégorie, sous-catégories et badges ciblés. Chaque suggestion peut désactiver certaines relances via <code>disabled_followup_ids</code>. Les relances communes (météo, horaires, carte, réserver, nouvelle conversation) sont activées par défaut.
          </p>
          <p>
            Les <b>business_ids ciblés</b> ne sont mis en avant que sur la 1ère réponse (pinned cards + carousel prioritaire). Dès qu'une relance est cliquée ou qu'un follow-up libre est saisi, la mise en avant disparaît pour éviter de re-pousser le même établissement en boucle.
          </p>
        </CardContent>
      </Card>

      {/* LLM */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wand2 className="h-4 w-4 text-primary" /> Quand le LLM intervient
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed">
          <p>
            Le modèle (<b>openai/gpt-5.6-sol</b> via Lovable AI Gateway, streaming SSE) est appelé <b>uniquement</b> quand ni la Classe A ni la Classe B ne résolvent la demande. Il reçoit :
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>un system prompt qui décrit l'hôte, la ville, la langue, le périmètre One World Morocco et les tools disponibles ;</li>
            <li>l'historique complet du thread (persisté serveur) ;</li>
            <li>les tools <code>search_businesses</code>, <code>search_events</code>, <code>get_weather</code>, <code>get_destinations</code>, <code>get_business_hours</code>, <code>get_booking_url</code>.</li>
          </ul>
          <p>
            Ses réponses sont contraintes : il doit citer les noms d'établissements en gras (transformés en liens cliquables par le front via <code>StrongCited</code>), ne jamais inventer un lieu absent des résultats, et refuser toute demande hors périmètre.
          </p>
        </CardContent>
      </Card>

      {/* Géolocalisation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" /> Géolocalisation & carte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed">
          <p>
            Par défaut, l'ancre de proximité est l'hôte (lat/lng de l'établissement affilié). Le visiteur peut ouvrir le popup <b>Choisir votre adresse</b> via le CTA « Lieu » de la barre liquid-glass en bas du slidepanel : il peut alors choisir sa géoloc navigateur ou la position de l'hôte (marqueur or). Les deux positions coexistent (host + user).
          </p>
          <p>
            La carte Google Maps embed respecte le mode light/dark de <code>/embed/ask</code> (thème beige / terracotta-gold) et affiche jusqu'à 20 marqueurs par résultat, cliquables pour ouvrir la fiche.
          </p>
        </CardContent>
      </Card>

      {/* Persistance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" /> Persistance & analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed">
          <p>
            Chaque conversation est <b>persistée côté client</b> (localStorage, TTL 7 jours) ET <b>côté serveur</b> (table <code>ai_chats</code>). Le pill « Nouvelle conversation » réinitialise localStorage et démarre un nouveau thread_id.
          </p>
          <p>
            Chaque tour loggue dans <code>ai_conversation_turns</code> et <code>ai_usage_events</code> : route empruntée, tools appelés, tokens consommés, coût USD, durée. Le dashboard IA (<code>/staff/ia</code> → onglet Perf) agrège ces données par jour/route/coût pour piloter les optimisations.
          </p>
        </CardContent>
      </Card>

      {/* Sécurité */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> Sécurité & garde-fous
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed">
          <ul className="list-disc pl-5 space-y-1">
            <li>La fonction edge est publique (<code>verify_jwt=false</code>) mais validée en interne : slug de l'hôte contrôlé contre <code>businesses</code>, langue whitelistée FR/EN/AR, message max 2000 chars.</li>
            <li>Aucune SQL brute côté client — uniquement des appels typés via le client Supabase et des tools serveur.</li>
            <li>Refus explicite hors périmètre : politique, médical, juridique, adresses hors Maroc, comparaison de prix agressive, « moins cher que… ».</li>
            <li>Pas de suivi de budget/prix intrusif dans le chat (aucune CTA « moins cher »).</li>
            <li>Les <code>engagements</code> à préfixe interne (<i>Logistique:</i>, <i>Certification:</i>, <i>Marché:</i>) sont strippés à l'affichage.</li>
          </ul>
        </CardContent>
      </Card>

      <div className="pt-2">
        <Badge variant="outline" className="text-xs">
          Source : <code className="ml-1">supabase/functions/embed-ai-chat/index.ts</code> · <code>src/pages/EmbedAsk.tsx</code>
        </Badge>
      </div>
    </div>
  );
}

function RouteItem({ name, desc }: { name: string; desc: string }) {
  return (
    <li className="border-l-2 border-primary/30 pl-3 py-1">
      <div className="font-medium">{name}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </li>
  );
}
