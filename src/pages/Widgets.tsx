import { useMemo, useState } from "react";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, CloudSun, MessageSquare, MapPin, Star, Newspaper, ExternalLink } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { toast } from "@/hooks/use-toast";

const SITE = "https://oneworldmorocco.com";
const DEMO_SLUG = "riad-dar-najat";

const CopyBlock = ({ code, id }: { code: string; id: string }) => {
  const [copied, setCopied] = useState(false);
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast({ title: "Code copié" });
    } catch {
      toast({ title: "Copie impossible", description: "Sélectionnez le code manuellement." });
    }
  };
  return (
    <div className="relative rounded-xl border border-border bg-muted/40 p-4">
      <pre className="overflow-x-auto text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap break-all">
        <code>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="secondary"
        onClick={doCopy}
        className="mt-3"
        aria-label={`Copier le code ${id}`}
      >
        {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
        {copied ? "Copié" : "Copier le code"}
      </Button>
    </div>
  );
};

interface WidgetSectionProps {
  index: number;
  icon: React.ReactNode;
  title: string;
  tagline: string;
  description: string;
  price: string;
  params?: { name: string; value: string }[];
  previewUrl?: string;
  previewNode?: React.ReactNode;
  previewHeight?: number;
  previewMaxWidth?: number;
  snippet: string;
  extra?: React.ReactNode;
}

const WidgetSection = ({
  index,
  icon,
  title,
  tagline,
  description,
  price,
  params,
  previewUrl,
  previewNode,
  previewHeight,
  previewMaxWidth,
  snippet,
  extra,
}: WidgetSectionProps) => (
  <section className="scroll-mt-32 border-t border-border pt-16">
    <div className="flex items-center gap-3 mb-4">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
        Widget {String(index).padStart(2, "0")}
      </span>
    </div>

    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{title}</h2>
    <p className="text-lg text-primary font-medium mb-4">{tagline}</p>
    <Badge className="mb-5">{price}</Badge>
    <p className="text-base text-muted-foreground max-w-3xl mb-8">{description}</p>

    {params && (
      <div className="flex flex-wrap gap-2 mb-10">
        {params.map((p) => (
          <Badge key={p.name} variant="outline" className="font-normal">
            <span className="font-semibold mr-1">{p.name}</span>
            {p.value}
          </Badge>
        ))}
      </div>
    )}

    <div className="grid gap-10 lg:grid-cols-2 items-start">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Aperçu en direct
        </h3>
        {previewNode ? (
          previewNode
        ) : (
          <>
            <iframe
              src={previewUrl}
              title={title}
              loading="lazy"
              style={{
                width: "100%",
                maxWidth: previewMaxWidth,
                height: previewHeight,
                border: 0,
                borderRadius: 20,
              }}
              className="bg-card shadow-lg"
            />
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Ouvrir en plein écran <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Code d'intégration
        </h3>
        <CopyBlock code={snippet} id={title} />
        {extra}
      </div>
    </div>
  </section>
);


const COMPATIBLE = [
  ["WordPress", "Bloc « HTML personnalisé » ou plugin iframe"],
  ["Wix / Wix Studio", "Élément « Intégrer un code » / HTML iframe"],
  ["Squarespace", "Bloc Code (plans Business et supérieurs)"],
  ["Webflow", "Composant Embed"],
  ["Shopify", "Section / page en HTML personnalisé"],
  ["Framer", "Composant Embed (iframe)"],
  ["Duda, Jimdo, Site123", "Widget HTML / iframe"],
  ["Ghost", "Carte HTML"],
  ["Drupal, Joomla, PrestaShop", "Bloc HTML libre"],
  ["HubSpot CMS", "Module HTML riche"],
  ["Notion (pages publiées)", "Bloc Embed via URL"],
  ["Google Sites", "Insérer > Intégrer > par URL"],
  ["Site sur-mesure (React, Vue, HTML statique…)", "Balise <iframe> classique"],
];

const INCOMPATIBLE = [
  ["Claude Artifacts / sandbox IA", "CSP du bac à sable qui bloque tout iframe tiers"],
  ["Wix Free (ADI sans code)", "Bloc HTML indisponible sans plan payant"],
  ["Squarespace Personal", "Bloc Code réservé aux plans supérieurs"],
  ["WordPress.com plan gratuit / Personal", "HTML arbitraire désactivé"],
  ["Facebook, Instagram, TikTok, LinkedIn (publications)", "Pas de HTML dans les posts"],
  ["Google Docs, Slides, Gmail, newsletters e-mail", "Les clients e-mail ignorent les iframes"],
  ["Medium, Substack (corps d'article)", "Embeds limités à une liste blanche"],
  ["Amazon, marketplaces, Airbnb, Booking", "HTML tiers interdit par les CGU"],
  ["Applications mobiles natives", "Nécessite une WebView, pas un iframe"],
  ["Sites en CSP stricte sans frame-src", "L'administrateur doit autoriser oneworldmorocco.com"],
];

const Widgets = () => {
  useSEO({
    title: "Widgets & iframes One World Morocco à intégrer",
    description:
      "Météo, assistant IA, adresses à proximité, avis clients, articles : intégrez les widgets One World Morocco sur votre site ou celui de vos partenaires.",
    canonical: "/widgets",
  });

  const weatherUrl = `${SITE}/embed/weather?city=Marrakech&lang=fr`;
  const askUrl = `${SITE}/embed/ask/${DEMO_SLUG}?theme=light&lang=fr`;
  const nearbyUrl = `${SITE}/embed/nearby/${DEMO_SLUG}?lang=fr`;
  const reviewsUrl = `${SITE}/embed/reviews/${DEMO_SLUG}?platform=synthese&lang=fr&ratio=vertical&size=sm`;

  const floatingSnippet = useMemo(
    () => `<!-- Panneau flottant One World Morocco -->
<style>
  #owm-tab{position:fixed;right:0;top:38%;z-index:99998;background:#B85C38;color:#fff;border:0;
    padding:14px 10px;border-radius:12px 0 0 12px;font:600 13px/1.2 system-ui;cursor:pointer;
    writing-mode:vertical-rl;letter-spacing:.06em}
  #owm-panel{position:fixed;top:0;right:0;height:100%;width:min(460px,100%);z-index:99999;
    background:#111;transform:translateX(100%);transition:transform .35s ease;box-shadow:-20px 0 60px rgba(0,0,0,.45)}
  #owm-panel.owm-open{transform:translateX(0)}
  #owm-panel iframe{width:100%;height:100%;border:0}
  #owm-close{position:absolute;left:-44px;top:14px;width:36px;height:36px;border:0;border-radius:50%;
    background:#fff;color:#111;font-size:18px;cursor:pointer}
</style>
<button id="owm-tab" aria-label="Ouvrir le widget One World Morocco">DÉCOUVRIR</button>
<div id="owm-panel" aria-hidden="true">
  <button id="owm-close" aria-label="Fermer">&times;</button>
  <iframe src="${askUrl}" title="Assistant One World Morocco" loading="lazy"></iframe>
</div>
<script>
(function(){
  var tab=document.getElementById('owm-tab'),panel=document.getElementById('owm-panel'),
      close=document.getElementById('owm-close');
  tab.addEventListener('click',function(){panel.classList.add('owm-open');panel.setAttribute('aria-hidden','false');});
  close.addEventListener('click',function(){panel.classList.remove('owm-open');panel.setAttribute('aria-hidden','true');});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close.click();});
})();
</script>`,
    [askUrl]
  );

  return (
    <div className="min-h-screen bg-background">
      <HomeMindtripHeader />

      <main className="container mx-auto px-4 pt-32 pb-24">
        <div className="max-w-5xl mx-auto">
          {/* Intro */}
          <header className="mb-20">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary mb-5">
              Écosystème ouvert
            </p>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight mb-8">
              Les widgets One World Morocco
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed mb-6">
              Météo locale, assistant IA conversationnel, adresses à proximité, avis clients vérifiés,
              articles éditoriaux : chaque brique de la plateforme est disponible sous forme de widget
              accessible depuis une URL publique.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              Ces widgets sont <strong className="text-foreground">intégrables à votre site web ou à celui
              de vos partenaires numériques, sous réserve de compatibilité technologique</strong> : la
              plateforme d'accueil doit autoriser l'insertion d'un code HTML libre (balise
              <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-sm">iframe</code>) et ne pas
              bloquer les contenus tiers par une politique de sécurité restrictive.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Aucune installation, aucune clé API, aucune maintenance : vous collez un extrait de code,
              le contenu reste synchronisé en temps réel avec nos données.
            </p>
          </header>

          {/* Widgets */}
          <div className="space-y-20">
            <WidgetSection
              index={1}
              icon={<CloudSun className="h-5 w-5" />}
              title="Widget Météo"
              tagline="La météo d'une ville marocaine, en direct et sans clé API."
              price="Gratuit"
              description="Températures actuelles, conditions et prévisions pour Marrakech, Essaouira ou toute autre ville couverte. Compact, sobre, signé oneworldmorocco.com. Une version JSON de l'API est également disponible pour un affichage entièrement sur-mesure."

              params={[
                { name: "city", value: "Marrakech, Essaouira…" },
                { name: "lang", value: "fr | en | ar" },
              ]}
              previewUrl={weatherUrl}
              previewHeight={320}
              previewMaxWidth={420}
              snippet={`<iframe src="${weatherUrl}" style="width:100%;max-width:420px;height:320px;border:0;border-radius:20px" title="Météo Marrakech" loading="lazy"></iframe>`}
            />

            <WidgetSection
              index={2}
              icon={<MessageSquare className="h-5 w-5" />}
              title="Widget Assistant IA"
              tagline="Un conseiller local intelligent, greffé à votre page."
              price="Prix : sur devis"
              description="L'assistant répond aux questions des visiteurs sur un établissement et son environnement : que faire à proximité, rooftops, horaires, réservation en ligne, articles de blog liés. Les suggestions de départ et les relances sont pilotées depuis notre back-office."

              params={[
                { name: "slug", value: "identifiant de l'établissement" },
                { name: "theme", value: "light | dark" },
                { name: "lang", value: "fr | en | ar" },
              ]}
              previewUrl={askUrl}
              previewHeight={620}
              previewMaxWidth={520}
              snippet={`<iframe src="${askUrl}" style="width:100%;max-width:520px;height:620px;border:0;border-radius:20px" title="Assistant One World Morocco" loading="lazy"></iframe>`}
              extra={
                <div className="mt-8">
                  <h4 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                    Variante : panneau flottant
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Un onglet fixé sur le bord droit de l'écran ouvre l'assistant en plein hauteur, sans
                    occuper d'espace dans votre mise en page. À coller avant la balise de fermeture
                    <code className="mx-1 rounded bg-muted px-1.5 py-0.5">body</code> (Wix : Custom Code).
                  </p>
                  <CopyBlock code={floatingSnippet} id="floating" />
                </div>
              }
            />

            <WidgetSection
              index={3}
              icon={<MapPin className="h-5 w-5" />}
              title="Widget Adresses à proximité"
              tagline="Les meilleures adresses autour d'un point, sur carte ou en liste."
              description="Reprend l'expérience de découverte de la plateforme : établissements actifs situés à moins d'un kilomètre, classés par catégorie, avec carte Google Maps, fiches détaillées et contact direct. La carte s'affiche immédiatement, sans média d'introduction."
              params={[
                { name: "slug", value: "établissement de référence" },
                { name: "lang", value: "fr | en | ar" },
              ]}
              previewUrl={nearbyUrl}
              previewHeight={620}
              previewMaxWidth={520}
              snippet={`<iframe src="${nearbyUrl}" style="width:100%;max-width:520px;height:620px;border:0;border-radius:20px" title="Adresses à proximité" loading="lazy"></iframe>`}
            />

            <WidgetSection
              index={4}
              icon={<Star className="h-5 w-5" />}
              title="Widget Avis clients"
              tagline="Google, TripAdvisor, Restaurant Guru — réunis et notés sur 20."
              description="Note sur 5, nombre d'avis et étoiles par plateforme, avis mis en avant en premier puis navigation dans l'intégralité des avis avec l'auteur. Le mode Synthèse ajoute le badge global noté sur 20. Cinq gabarits sont disponibles (vertical S/L, horizontal S/L, carré) et le widget s'adapte automatiquement à la largeur de son cadre."
              params={[
                { name: "platform", value: "synthese | google | tripadvisor | restaurantguru" },
                { name: "ratio", value: "auto | vertical | horizontal | square" },
                { name: "size", value: "auto | sm | lg" },
                { name: "lang", value: "fr | en | ar" },
              ]}
              previewUrl={reviewsUrl}
              previewHeight={560}
              previewMaxWidth={460}
              snippet={`<iframe src="${reviewsUrl}" style="width:100%;max-width:460px;height:560px;border:0;border-radius:20px" title="Avis clients" loading="lazy"></iframe>`}
            />

            <WidgetSection
              index={5}
              icon={<Newspaper className="h-5 w-5" />}
              title="Export d'article de blog"
              tagline="Votre article éditorial, republié sur votre propre domaine."
              description="Depuis l'espace affilié, chaque article dont vous êtes propriétaire s'exporte en page HTML autonome : mise en page complète, médias servis depuis oneworldmorocco.com, et panneau latéral intégré qui ouvre les fiches des établissements cités avec navigation par balayage vertical. Aucun rendu dynamique à maintenir de votre côté."
              previewUrl={`${SITE}/embed/ask/${DEMO_SLUG}?theme=light&lang=fr`}
              previewHeight={420}
              previewMaxWidth={520}
              snippet={`<!-- Fichier HTML téléchargé depuis /affiliates/presence > onglet Outils > Vos articles de blog -->
<!-- À déposer tel quel sur votre hébergement, ou à coller dans une page de votre CMS -->`}
            />
          </div>

          {/* Compatibilité */}
          <section className="mt-24 border-t border-border pt-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Compatibilité des plateformes
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mb-12">
              La règle est simple : si la plateforme permet d'insérer un code HTML libre, les widgets
              fonctionnent. Voici l'état des lieux des principaux environnements.
            </p>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-7">
                <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  Plateformes compatibles
                </h3>
                <ul className="space-y-4">
                  {COMPATIBLE.map(([name, how]) => (
                    <li key={name}>
                      <p className="text-sm font-semibold text-foreground">{name}</p>
                      <p className="text-sm text-muted-foreground">{how}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-card p-7">
                <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <span className="text-destructive text-lg leading-none">×</span>
                  Plateformes non compatibles
                </h3>
                <ul className="space-y-4">
                  {INCOMPATIBLE.map(([name, why]) => (
                    <li key={name}>
                      <p className="text-sm font-semibold text-foreground">{name}</p>
                      <p className="text-sm text-muted-foreground">{why}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Aide */}
          <section className="mt-20 rounded-3xl border border-border bg-card p-10 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Besoin d'une intégration sur mesure ?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Les établissements partenaires génèrent leurs propres codes, adaptés à leur fiche, depuis
              l'onglet Outils de leur espace. Pour un format spécifique ou un accès aux données en JSON,
              écrivez-nous.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <a href="/affiliates/presence">Espace partenaire</a>
              </Button>
              <Button asChild variant="outline">
                <a href="/contact">Nous contacter</a>
              </Button>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Widgets;
