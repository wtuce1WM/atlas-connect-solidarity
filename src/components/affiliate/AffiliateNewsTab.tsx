import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, XCircle, Bot, MapPin, Newspaper, Mail, Star, CloudSun, Waves, ThumbsUp, BarChart3, Video, Globe2, ExternalLink, Eye, QrCode, LayoutPanelTop, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type NewsRights = {
  aiAssistant: boolean;
  blogExport: boolean;
  nearbyWidget: boolean;
  emailSignature: boolean;
  dashboard: boolean;
  videoStudio: boolean;
  showcaseSite: boolean;
  customDomain: boolean;
};

interface Props {
  businessName: string;
  businessId?: string | null;
  affiliateName?: string;
  slug: string | null;
  rights: NewsRights;
  onGoToTools?: () => void;
}

/** Champ « URL cible » du site vitrine, avec CTA de sauvegarde au niveau du champ. */
const ShowcaseTargetUrlField = ({ businessId }: { businessId: string }) => {
  const { toast } = useToast();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancel = false;
    supabase
      .from("businesses")
      .select("showcase_target_url")
      .eq("id", businessId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancel) setValue(((data as any)?.showcase_target_url as string) || "");
      });
    return () => { cancel = true; };
  }, [businessId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("businesses")
      .update({ showcase_target_url: value.trim() || null } as any)
      .eq("id", businessId);
    setSaving(false);
    toast(error
      ? { title: "Erreur", description: error.message, variant: "destructive" }
      : { title: "URL cible enregistrée" });
  };

  return (
    <div className="mt-2 space-y-1">
      <p className="text-[11px] text-white/50">URL cible (votre domaine)</p>
      <div className="flex items-center gap-2 max-w-md">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://votredomaine.com"
          className="h-8 text-xs bg-white/5 border-white/15 text-white"
        />
        <Button type="button" size="sm" className="h-8 px-2" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};


type Preview =
  | { kind: "iframe"; url: string; height?: number }
  | { kind: "qr" }
  | null;

type Item = {
  key: string;
  label: string;
  icon: any;
  scope: "Établissement" | "Compte affilié";
  price: string;
  free?: boolean;
  enabled: boolean;
  locked?: boolean;
  desc: string;
  preview?: Preview;
};

const SITE = "https://oneworldmorocco.com";

const AffiliateNewsTab = ({ businessName, affiliateName, slug, rights, onGoToTools }: Props) => {
  const accountLabel = affiliateName?.trim() || "Compte affilié";
  const publicUrl = slug ? `${SITE}/b/${slug}` : SITE;
  const [preview, setPreview] = useState<{ title: string; p: Exclude<Preview, null> } | null>(null);

  const LinkCell = ({ scope }: { scope: "Établissement" | "Compte affilié" }) => (
    <div className="leading-tight">
      <p className="text-white/80">{scope === "Établissement" ? businessName : accountLabel}</p>
      <p className="text-[11px] text-white/40">
        {scope === "Établissement" ? "Liaison établissement" : "Liaison compte affilié"}
      </p>
    </div>
  );

  const items: Item[] = [
    {
      key: "ai",
      label: "Widget Assistant IA",
      icon: Bot,
      scope: "Établissement",
      price: "Sur devis",
      enabled: rights.aiAssistant,
      desc: "Un assistant conversationnel embarqué sur votre site, qui répond aux questions de vos visiteurs et les oriente vers vos offres et les adresses à proximité.",
      preview: slug ? { kind: "iframe", url: `${SITE}/embed/ask/${slug}?lang=fr`, height: 640 } : null,
    },
    {
      key: "nearby",
      label: "Widget Adresses à proximité",
      icon: MapPin,
      scope: "Établissement",
      price: "Sur devis",
      enabled: rights.nearbyWidget,
      desc: "Carte Google + liste filtrable des établissements et lieux d'intérêt autour de vous, avec ouverture des fiches sans quitter votre site.",
      preview: slug ? { kind: "iframe", url: `${SITE}/embed/nearby/${slug}?lang=fr`, height: 620 } : null,
    },
    {
      key: "blog",
      label: "Export d'article de blog",
      icon: Newspaper,
      scope: "Établissement",
      price: "Sur devis",
      enabled: rights.blogExport,
      desc: "Publiez sur votre propre site un article de blog 1WM rattaché à votre établissement (carrousel photos, carte, badges avis, panneau fiche).",
    },
    {
      key: "signature",
      label: "Signature email « Laisser un avis »",
      icon: Mail,
      scope: "Établissement",
      price: "Inclus dans l'abonnement",
      enabled: rights.emailSignature,
      desc: "Bloc HTML statique (Gmail, Outlook, Apple Mail) qui invite vos clients à laisser un avis Google / TripAdvisor depuis chaque email envoyé.",
      preview: slug
        ? { kind: "iframe", url: `${SITE}/embed/avis/${slug}?platform=all&lang=fr&variant=card`, height: 380 }
        : null,
    },
    {
      key: "dashboard",
      label: "Dashboard statistiques",
      icon: BarChart3,
      scope: "Compte affilié",
      price: "Inclus dans l'abonnement",
      enabled: rights.dashboard,
      desc: "Vues de fiche, clics contact, itinéraires, sources de trafic et évolution sur la période, établissement par établissement.",
      preview: { kind: "iframe", url: `/affiliates/dashboard`, height: 700 },
    },
    {
      key: "fiche",
      label: "Widget Votre ID numérique type Linktree",
      icon: LayoutPanelTop,
      scope: "Établissement",
      price: "Inclus dans l'abonnement",
      enabled: true,
      desc: "Tous vos canaux numériques rassemblés au même endroit. Un lien court et personnalisé que les voyageurs retiennent vraiment — oneworldmorocco.com/yourname. Un seul tap affiche vos offres, vos contacts et vos photos, sur un domaine de voyage de confiance.",
      preview: slug ? { kind: "iframe", url: `${SITE}/b/${slug}?embed=1`, height: 760 } : null,
    },
    {
      key: "qr",
      label: "Votre QR code",
      icon: QrCode,
      scope: "Établissement",
      price: "Inclus dans l'abonnement",
      enabled: true,
      desc: "Votre propre QR code, à un scan de votre business en ligne. Imprimez le QR sur les reçus, les menus et les cartes de visite.",
      preview: { kind: "qr" },
    },
    {
      key: "studio",
      label: "Studio Vidéo IA",
      icon: Video,
      scope: "Compte affilié",
      price: "Sur devis",
      enabled: rights.videoStudio,
      desc: "Génération de vidéos verticales à partir de vos photos, offres, avis clients et blocs mis en avant.",
    },
    {
      key: "showcase",
      label: "Votre site web avec votre nom de domaine avec les données 1WM",
      icon: Globe2,
      scope: "Établissement",
      price: "Sur devis",
      enabled: rights.showcaseSite,
      desc: "Votre site web avec page de présentation dédiée hébergée par One World Morocco (photos, offres, avis, contact) sur votredomaine.com.",
    },
  ];

  const freeWidgets = [
    {
      key: "reviews",
      label: "Widget Avis clients",
      icon: Star,
      desc: "Vos avis Google, TripAdvisor et Restaurant Guru sur votre site : note /5, note globale /20, nombre d'avis et avis détaillés.",
      url: slug ? `${SITE}/embed/reviews/${slug}?platform=all&lang=fr` : null,
      height: 480,
    },
    {
      key: "rate",
      label: "Widget Laisser un avis",
      icon: ThumbsUp,
      desc: "Incite vos clients à noter votre établissement sur Google et TripAdvisor en un clic (version carte ou barre).",
      url: slug ? `${SITE}/embed/avis/${slug}?platform=all&lang=fr&variant=card` : null,
      height: 380,
    },
    {
      key: "weather",
      label: "Widget Météo",
      icon: CloudSun,
      desc: "Météo du jour et prévisions pour votre ville, à intégrer sur votre site.",
      url: `${SITE}/embed/weather?city=Marrakech&lang=fr`,
      height: 420,
    },
    {
      key: "tides",
      label: "Widget Marées",
      icon: Waves,
      desc: "Horaires des marées pour les villes côtières marocaines (Essaouira, Agadir, Sidi Kaouki…).",
      url: `${SITE}/embed/tides?city=Essaouira&lang=fr`,
      height: 420,
    },
  ];

  const activeCount = items.filter((i) => i.enabled).length;

  const PreviewButton = ({ title, p }: { title: string; p?: Preview }) =>
    p ? (
      <button
        type="button"
        onClick={() => setPreview({ title, p })}
        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
      >
        <Eye className="h-3 w-3" /> Visualiser
      </button>
    ) : null;

  return (
    <div className="space-y-8">
      {/* Intro */}
      <div className="space-y-2">
        <h3 className="text-white font-semibold text-lg">Vos services 1WM</h3>
        <p className="text-sm text-white/70">
          Récapitulatif des services et widgets disponibles pour{" "}
          <span className="font-semibold text-white">{businessName}</span>.{" "}
          <span className="text-white">{activeCount}</span> service{activeCount > 1 ? "s" : ""} activé
          {activeCount > 1 ? "s" : ""} sur {items.length}. Les widgets gratuits sont accessibles à tous,
          sans activation.
        </p>
        {onGoToTools && (
          <button
            type="button"
            onClick={onGoToTools}
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            Récupérer les codes d'intégration dans l'onglet Tools <ExternalLink className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-white/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="text-left font-medium text-white/60 px-3 py-2">Service</th>
              <th className="text-left font-medium text-white/60 px-3 py-2 whitespace-nowrap">Liaison</th>
              <th className="text-left font-medium text-white/60 px-3 py-2 whitespace-nowrap">Tarif</th>
              <th className="text-left font-medium text-white/60 px-3 py-2 whitespace-nowrap">Statut</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.key} className="border-b border-white/5 last:border-0">
                <td className="px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <i.icon className={`h-4 w-4 mt-0.5 shrink-0 ${i.enabled ? "text-primary" : "text-white/30"}`} />
                    <div>
                      <p className={i.enabled ? "text-white font-medium" : "text-white/60 font-medium"}>{i.label}</p>
                      <p className="text-xs text-white/50 mt-0.5 max-w-xl">{i.desc}</p>
                      {i.enabled && i.preview && (
                        <div className="mt-1">
                          <PreviewButton title={i.label} p={i.preview} />
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap"><LinkCell scope={i.scope} /></td>
                <td className="px-3 py-2.5 text-white/60 whitespace-nowrap">{i.price}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {i.locked ? (
                    <span className="text-xs text-white/40">Bientôt disponible</span>
                  ) : i.enabled ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Activé
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-white/40">
                      <XCircle className="h-3.5 w-3.5" /> Non activé
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {freeWidgets.map((w) => (
              <tr key={w.key} className="border-b border-white/5 last:border-0">
                <td className="px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <w.icon className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <div>
                      <p className="text-white font-medium">{w.label}</p>
                      <p className="text-xs text-white/50 mt-0.5 max-w-xl">{w.desc}</p>
                      {w.url && (
                        <div className="mt-1">
                          <PreviewButton title={w.label} p={{ kind: "iframe", url: w.url, height: w.height }} />
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap"><LinkCell scope="Établissement" /></td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-whatsapp/15 text-whatsapp">
                    Gratuit
                  </span>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Disponible
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Free widgets cards */}
      <div className="space-y-3">
        <h4 className="text-white font-semibold flex items-center gap-2">
          Widgets gratuits
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-whatsapp/15 text-whatsapp">
            Inclus
          </span>
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {freeWidgets.map((w) => (
            <div key={w.key} className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <w.icon className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm font-semibold text-white">{w.label}</p>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">{w.desc}</p>
              <div className="flex items-center gap-3">
                {w.url && (
                  <>
                    <PreviewButton title={w.label} p={{ kind: "iframe", url: w.url, height: w.height }} />
                    <a
                      href={w.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Nouvel onglet <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                )}
                {onGoToTools && (
                  <button type="button" onClick={onGoToTools} className="text-xs text-white/60 hover:text-white">
                    Code d'intégration
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/50">
          Catalogue complet et démos en direct :{" "}
          <a href={`${SITE}/widgets`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            oneworldmorocco.com/widgets
          </a>
        </p>
      </div>

      {/* Non activés */}
      {items.some((i) => !i.enabled && !i.locked) && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
          <h4 className="text-sm font-semibold text-white">Services non activés</h4>
          <p className="text-xs text-white/60 leading-relaxed">
            Ces services existent déjà sur la plateforme mais ne sont pas ouverts sur votre compte :{" "}
            {items.filter((i) => !i.enabled && !i.locked).map((i) => i.label).join(" · ")}.
          </p>
          <a
            href="mailto:info@oneworldmorocco.com?subject=Activation%20de%20services%201WM"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Mail className="h-3 w-3" /> Demander une activation
          </a>
        </div>
      )}

      {/* Preview popup */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl bg-neutral-950 border-white/10 dark">
          <DialogHeader>
            <DialogTitle className="text-white text-base">{preview?.title}</DialogTitle>
          </DialogHeader>
          {preview?.p.kind === "iframe" && (
            <div className="space-y-2">
              <iframe
                src={preview.p.url}
                style={{ width: "100%", height: preview.p.height ?? 560, border: 0, borderRadius: 16, background: "transparent" }}
                title={preview.title}
                loading="lazy"
              />
              <a
                href={preview.p.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                Ouvrir dans un nouvel onglet <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          {preview?.p.kind === "qr" && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="bg-white p-4 rounded-xl">
                <QRCodeSVG value={publicUrl} size={220} level="M" />
              </div>
              <p className="text-xs text-white/60 break-all text-center">{publicUrl}</p>
              {onGoToTools && (
                <button type="button" onClick={() => { setPreview(null); onGoToTools(); }} className="text-xs text-primary hover:underline">
                  Télécharger le QR (onglet Tools)
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AffiliateNewsTab;
