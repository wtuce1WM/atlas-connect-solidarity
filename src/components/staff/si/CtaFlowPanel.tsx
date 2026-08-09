const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-lg border border-border bg-background p-3">
    <div className="font-bold text-sm mb-2">{title}</div>
    <div className="text-[11px] leading-relaxed text-muted-foreground flex flex-col gap-1.5">{children}</div>
  </div>
);

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <div className="flex gap-2">
    <span className="shrink-0 h-5 w-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center">{n}</span>
    <div className="text-foreground">{children}</div>
  </div>
);

/**
 * Documentation vivante de la hiérarchie CTA / widgets de la fiche
 * (rail de gauche, barre rectangulaire, overlay Full Description).
 */
const CtaFlowPanel = () => (
  <div className="h-full overflow-auto p-4 text-foreground">
    <h3 className="font-bold mb-3">Résolution d'une URL d'établissement (url 1 → url 5)</h3>
    <div className="grid gap-3 md:grid-cols-2">
      <Card title="Arbre de décision par URL">
        <Step n={1}>Un <b>code de widget par intention</b> correspond au libellé du CTA → on affiche le widget (jamais l'iframe de l'URL). YouTube exclu de ce cas.</Step>
        <Step n={2}>Sinon, si <b>« Lien externe » est activé</b> → CTA qui ouvre l'URL dans un nouvel onglet.</Step>
        <Step n={3}>Sinon, si le libellé contient <i>Réservez / Réserver en ligne / Day Pass / Réserver une table ou chambre / Billetterie</i> → l'URL est <b>embarquée en iframe</b> dans l'overlay Full Description.</Step>
        <Step n={4}>Sinon → CTA simple (ouverture externe).</Step>
      </Card>

      <Card title="Autorité de réservation unique">
        <div className="text-foreground">Une seule autorité de réservation à la fois :</div>
        <div>• Système propre de l'établissement (widget par intention ou iframe de réservation) → <b>prioritaire</b>.</div>
        <div>• Notre widget « Vérifier la disponibilité » (SerpAPI) → affiché <b>uniquement</b> s'il n'existe ni widget par intention, ni iframe de réservation, ni lien externe de réservation.</div>
        <div>• Jamais deux widgets de réservation simultanément dans la fiche.</div>
      </Card>

      <Card title="Où s'affiche quoi">
        <div>• <b>Rail gauche</b> (fiche) : Localisation, Langues, Itinéraire (dépliant, icône voiture si rayon &gt; 10 km).</div>
        <div>• <b>Barre rectangulaire</b> : uniquement le CTA lié à <code>online_shop_url</code> (url 2).</div>
        <div>• <b>Barre fixe du bas</b> : WhatsApp en 1ʳᵉ position, puis réseaux, puis plateformes de réservation.</div>
        <div>• <b>Overlay Full Description</b> : cartes popup/offres, highlights, Assistant IA, à proximité, avis, vidéos, YouTube, horaires, disponibilité, widgets d'intention.</div>
      </Card>

      <Card title="Sources de vérité (base)">
        <div>• <code>businesses</code> : url 1→5 + libellés CTA + <code>online_shop_url</code> + <code>whatsapp</code>.</div>
        <div>• <code>widget_code</code> (par intention) sur l'établissement.</div>
        <div>• <code>business_feature_rights</code> : droits par fonctionnalité (site vitrine, widgets publiés…).</div>
        <div>• <code>business_published_widgets</code> : widgets exposés côté affilié.</div>
        <div>• <code>hotel_api_mappings</code> / <code>serpapi_hotels_cache</code> : disponibilité et prix.</div>
      </Card>

      <Card title="Pièges connus">
        <div>• <b>Doublons d'id DOM</b> : deux instances d'un même widget de réservation cassent le script tiers.</div>
        <div>• <b>Sémantique du champ URL</b> : un lien externe marqué comme réservation casse l'iframe attendue.</div>
        <div>• <b>Molette</b> : le hijack global de la page de recherche doit laisser passer les rails horizontaux.</div>
      </Card>
    </div>
    <p className="mt-4 text-[11px] text-muted-foreground">Vue documentaire : reflète la logique implémentée dans <code>BookOnlineSlidePanel</code> et <code>WidgetCodeEmbed</code>.</p>
  </div>
);

export default CtaFlowPanel;
