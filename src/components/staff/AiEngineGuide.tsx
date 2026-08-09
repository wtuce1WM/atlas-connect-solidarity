import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const Row = ({ q, where, what }: { q: string; where: string; what: string }) => (
  <tr className="border-b last:border-0 align-top">
    <td className="py-2 pr-4 font-medium">{q}</td>
    <td className="py-2 pr-4 text-sm">{where}</td>
    <td className="py-2 text-sm text-muted-foreground">{what}</td>
  </tr>
);

const AiEngineGuide = ({ onNavigateTab }: { onNavigateTab?: (t: string) => void }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Comment fonctionne le moteur IA (matrice A / B / C)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            Les trois surfaces conversationnelles — <strong>/club</strong> (Assistant du Club),
            <strong> /embed/ask</strong> (widget affilié) et <strong>l'onglet IA de /search</strong> — passent par le même
            moteur partagé. Une question suit toujours ce chemin :
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <Badge className="bg-emerald-100 text-emerald-800 mr-2">Classe A</Badge>
              <strong>Route déterministe, 0 token.</strong> La question correspond à une intention connue (météo, marées,
              horaires, prix, réservation, avis, à proximité, carte, hors périmètre…). La réponse est construite en SQL à
              partir de la base, avec un texte gabarit. Coût nul, latence minimale, résultat toujours exact.
            </li>
            <li>
              <Badge className="bg-amber-100 text-amber-800 mr-2">Classe B</Badge>
              <strong>Classifieur léger + recherche déterministe.</strong> Un petit appel LLM extrait l'intention et les
              paramètres (catégorie, ville, quartier, exclusions, point de vue, budget). Si sa confiance dépasse le seuil,
              il a <em>autorité</em> : la recherche est exécutée directement avec ces paramètres, sans rédaction libre.
            </li>
            <li>
              <Badge className="bg-rose-100 text-rose-800 mr-2">Classe C</Badge>
              <strong>Génératif complet.</strong> Réservé aux questions ouvertes sur une fiche, comparaisons et
              itinéraires. Le LLM rédige, mais uniquement à partir des données du thread (jamais d'invention).
            </li>
          </ol>
          <p className="text-muted-foreground">
            Règle d'or : tout ce qui peut être répondu en Classe A ne doit jamais passer en C. Le Dashboard IA mesure
            exactement cette couverture A/B.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quelle classe pour quelle route actuelle ?</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <p className="text-sm text-muted-foreground mb-4">
            Le moteur connaît les routes ci-dessous. Une route est rarement « libre » : elle a une classe par défaut décidée par ce qu'on peut prouver sans LLM. Le staff peut activer/désactiver une route et choisir les surfaces, mais pas changer la classe par défaut (§2 de la spec).
          </p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-4">Route</th>
                <th className="py-2 pr-4">Classe</th>
                <th className="py-2">Pourquoi</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b align-top">
                <td className="py-2 pr-4 font-mono text-xs">weather</td>
                <td className="py-2 pr-4"><Badge className="bg-emerald-100 text-emerald-800">A</Badge></td>
                <td className="py-2 text-muted-foreground">API météo + ville résolue → texte gabarit. Pas d'interprétation libre.</td>
              </tr>
              <tr className="border-b align-top">
                <td className="py-2 pr-4 font-mono text-xs">tides</td>
                <td className="py-2 pr-4"><Badge className="bg-emerald-100 text-emerald-800">A</Badge></td>
                <td className="py-2 text-muted-foreground">Marées / vent / surf via API → template. Déterministe.</td>
              </tr>
              <tr className="border-b align-top">
                <td className="py-2 pr-4 font-mono text-xs">opening</td>
                <td className="py-2 pr-4"><Badge className="bg-emerald-100 text-emerald-800">A</Badge></td>
                <td className="py-2 text-muted-foreground">Horaires stockés en <code>opening_hours</code> : ouvert/fermé calculé maintenant, texte gabarit.</td>
              </tr>
              <tr className="border-b align-top">
                <td className="py-2 pr-4 font-mono text-xs">pricing</td>
                <td className="py-2 pr-4"><Badge className="bg-emerald-100 text-emerald-800">A</Badge></td>
                <td className="py-2 text-muted-foreground">Seuls <code>min_price</code> ou <code>manual_price_range</code> comptent (hôtels/riads). Pas de rédaction.</td>
              </tr>
              <tr className="border-b align-top">
                <td className="py-2 pr-4 font-mono text-xs">booking</td>
                <td className="py-2 pr-4"><Badge className="bg-emerald-100 text-emerald-800">A</Badge></td>
                <td className="py-2 text-muted-foreground">URLs 1→5 typées (Réserver / Billetterie) + téléphone / WhatsApp. Template immersif.</td>
              </tr>
              <tr className="border-b align-top">
                <td className="py-2 pr-4 font-mono text-xs">reviews</td>
                <td className="py-2 pr-4"><Badge className="bg-emerald-100 text-emerald-800">A</Badge></td>
                <td className="py-2 text-muted-foreground">Note + nombre d'avis + extraits. Tri et filtre par données.</td>
              </tr>
              <tr className="border-b align-top">
                <td className="py-2 pr-4 font-mono text-xs">events</td>
                <td className="py-2 pr-4"><Badge className="bg-emerald-100 text-emerald-800">A</Badge></td>
                <td className="py-2 text-muted-foreground">Table <code>search_events</code> + dates résolues → template.</td>
              </tr>
              <tr className="border-b align-top">
                <td className="py-2 pr-4 font-mono text-xs">map</td>
                <td className="py-2 pr-4"><Badge className="bg-emerald-100 text-emerald-800">A</Badge></td>
                <td className="py-2 text-muted-foreground">IDs connus du thread → overlay map. Zéro appel LLM.</td>
              </tr>
              <tr className="border-b align-top">
                <td className="py-2 pr-4 font-mono text-xs">nearby</td>
                <td className="py-2 pr-4"><Badge className="bg-emerald-100 text-emerald-800">A</Badge></td>
                <td className="py-2 text-muted-foreground">Comptage par catégorie de Structure du Front à moins de 1 km + template.</td>
              </tr>
              <tr className="border-b align-top">
                <td className="py-2 pr-4 font-mono text-xs">out_of_scope</td>
                <td className="py-2 pr-4"><Badge className="bg-emerald-100 text-emerald-800">A</Badge></td>
                <td className="py-2 text-muted-foreground">Visa, vol, politique, santé → refus gabarit + 3 relances.</td>
              </tr>
              <tr className="border-b align-top">
                <td className="py-2 pr-4 font-mono text-xs">smalltalk</td>
                <td className="py-2 pr-4"><Badge className="bg-emerald-100 text-emerald-800">A</Badge></td>
                <td className="py-2 text-muted-foreground">Salutations / méta-questions par regex + template + suggestions.</td>
              </tr>
              <tr className="border-b align-top">
                <td className="py-2 pr-4 font-mono text-xs">discover</td>
                <td className="py-2 pr-4"><Badge className="bg-amber-100 text-amber-800">B</Badge></td>
                <td className="py-2 text-muted-foreground">Classifieur court extrait catégorie, ville, exclusions, point de vue. Si confiance ≥ seuil, recherche directe sans rédaction. Ex : « un bar à Gueliz », « restaurant pas hôtel ».</td>
              </tr>
              <tr className="border-b align-top">
                <td className="py-2 pr-4 font-mono text-xs">business_qa</td>
                <td className="py-2 pr-4"><Badge className="bg-rose-100 text-rose-800">C</Badge></td>
                <td className="py-2 text-muted-foreground">Question libre sur une fiche en cours (cuisine, ambiance, services). Le LLM rédige à partir de la fiche + avis.</td>
              </tr>
              <tr className="border-b align-top">
                <td className="py-2 pr-4 font-mono text-xs">compare</td>
                <td className="py-2 pr-4"><Badge className="bg-rose-100 text-rose-800">C</Badge></td>
                <td className="py-2 text-muted-foreground">« Lequel des deux pour un dîner d'affaires ? » → synthèse de 2 fiches + contexte.</td>
              </tr>
              <tr className="border-b align-top">
                <td className="py-2 pr-4 font-mono text-xs">itinerary</td>
                <td className="py-2 pr-4"><Badge className="bg-rose-100 text-rose-800">C</Badge></td>
                <td className="py-2 text-muted-foreground">Journée type / itinéraire avec distances et horaires. Nécessite du raisonnement.</td>
              </tr>
              <tr className="border-b align-top">
                <td className="py-2 pr-4 font-mono text-xs">discover (fallback)</td>
                <td className="py-2 pr-4"><Badge className="bg-rose-100 text-rose-800">C</Badge></td>
                <td className="py-2 text-muted-foreground">Même route <code>discover</code>, mais confiance trop faible ou question floue (« endroit calme pour finir la soirée »). Le LLM rédige la sélection.</td>
              </tr>
            </tbody>
          </table>
          <p className="text-sm text-muted-foreground mt-4">
            Les traitements de rangement sur la liste déjà connue (plus proche, plus loin, mieux noté, compte, ordinal, détail, engagements) sont exécutés en Classe A car ils n'interrogent pas de LLM : ils trient/filtrent la liste précédente.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ce que tu dois renseigner, et où</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-4">À paramétrer</th>
                <th className="py-2 pr-4">Où</th>
                <th className="py-2">Pourquoi</th>
              </tr>
            </thead>
            <tbody>
              <Row
                q="Routes du moteur"
                where="Moteur IA → onglet Routes"
                what="Activer/désactiver une intention, choisir sa classe, les surfaces où elle s'applique et le seuil de confiance du classifieur."
              />
              <Row
                q="Modèle, prompts, seuils globaux"
                where="Onglet IA"
                what="Modèle utilisé (openai/gpt-5.6-sol), prompts système, seuil de confiance par défaut, garde-fous."
              />
              <Row
                q="Suggestions & relances /club"
                where="Onglet Suggestions Chat IA du Club"
                what="4 suggestions d'entrée + relances contextuelles, rattachées à une route et à une taxonomie (catégorie / sous-catégorie / ville)."
              />
              <Row
                q="Suggestions & relances widget"
                where="Onglet Suggestions Embed IA"
                what="Mêmes règles pour le widget affilié, avec les préférences par établissement."
              />
              <Row
                q="Suggestions & relances Search IA"
                where="Onglet Search IA"
                what="Chips affichées dans l'onglet IA de /search, rattachées aux mêmes routes."
              />
              <Row
                q="Connaissances rédactionnelles"
                where="Onglets KB IA / Base IA"
                what="Contenus de référence que la Classe C peut citer. Rien hors de cette base ne doit apparaître dans une réponse."
              />
              <Row
                q="Contrôle des coûts et de la qualité"
                where="Dashboard · Utilisation IA · Perf IA"
                what="Coût et tokens par classe, couverture A/B par surface, top routes, taux d'erreur, latence."
              />
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Les données métier qui font la qualité des réponses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            En Classe A et B, la réponse ne vaut que ce que vaut la fiche. Les champs les plus déterminants :
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Catégorisation Structure du Front</strong> (catégorie / sous-catégories) : pilote le filtrage et les comptages « à proximité ».</li>
            <li><strong>Géo</strong> : ville, quartier, latitude/longitude — indispensables aux rayons et aux points de vue (Koutoubia, Atlas).</li>
            <li><strong>Badges</strong> (ex. Rooftop Restaurant &amp; Bars) : servent de preuve de point de vue et d'équipement.</li>
            <li><strong>Prix</strong> : <code>min_price</code> ou <code>manual_price_range</code> uniquement — jamais la gamme.</li>
            <li><strong>Réservation</strong> : liens URL 1 à 5 typés (Réserver / Billetterie), téléphone, WhatsApp.</li>
            <li><strong>Horaires</strong> et <strong>avis</strong> : alimentent les routes horaires et avis sans aucun token.</li>
          </ul>
        </CardContent>
      </Card>

      {onNavigateTab && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigateTab("dashboard")}>Ouvrir le Dashboard IA</Button>
          <Button variant="outline" size="sm" onClick={() => onNavigateTab("ai-config")}>Ouvrir l'onglet IA</Button>
          <Button variant="outline" size="sm" onClick={() => onNavigateTab("ai-perf")}>Ouvrir Perf IA</Button>
        </div>
      )}
    </div>
  );
};

export default AiEngineGuide;
