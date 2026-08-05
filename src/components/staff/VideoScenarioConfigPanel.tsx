import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowDown, ArrowUp, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export type VideoScenarioMode = "business" | "corporate";

export type VideoScenarioStep = {
  id: string;
  mode: VideoScenarioMode;
  scene_key: string;
  label: string | null;
  position: number;
  duration_sec: number;
  enabled: boolean;
};

const MODES: Array<{ value: VideoScenarioMode; label: string }> = [
  { value: "business", label: "Établissement" },
  { value: "corporate", label: "Corporate" },
];

/**
 * Descriptif fonctionnel de chaque étape : ce qu'elle affiche, la condition
 * qui la fait entrer au montage (sinon elle est retirée automatiquement),
 * et ses spécificités de rendu.
 */
const STEP_DOCS: Record<string, { what: string; filter: string; notes?: string }> = {
  logo: {
    what: "Ouverture sur le logo de l'établissement, sur fond de marque.",
    filter: "Incluse seulement si « Ouvrir avec le logo » est cochée ET qu'un logo existe.",
    notes: "Le média du logo n'est pas réutilisé juste après (rotation des médias) pour éviter la répétition.",
  },
  welcome: {
    what: "Carte texte d'accueil (champ BIENVENUE des CTAs de Présence en ligne).",
    filter: "Incluse seulement si le texte BIENVENUE n'est pas vide.",
    notes: "Rich Text respecté (gras, puces). Texte auto-réduit pour tenir dans le cadre.",
  },
  name: {
    what: "Nom de l'établissement + identité (catégorie, ville/quartier).",
    filter: "Toujours présente.",
    notes: "Titre en Montserrat sur média plein cadre (rotation) ; badges catégorie/ville animés en entrée.",
  },
  popup: {
    what: "Visuel du popup promotionnel de la fiche, plein cadre.",
    filter: "Incluse seulement si « Popup » est cochée ET qu'une image de popup existe.",
    notes: "Image affichée sans recadrage agressif (proportions préservées) ; aucun texte ajouté par-dessus.",
  },
  proposition: {
    what: "Carte texte de proposition de valeur (champ PROPOSITION des CTAs).",
    filter: "Incluse seulement si le texte PROPOSITION n'est pas vide.",
    notes: "Rich Text respecté (gras, puces, retours ligne) ; mise à l'échelle automatique du texte ; média de fond par rotation ou média assigné.",
  },
  weather: {
    what: "Widget Météo animé sur la ville choisie dans le Studio.",
    filter: "Incluse seulement si l'étape est activée dans le Studio et qu'une ville est sélectionnée.",
    notes: "La durée définie ici pilote directement la durée du widget au montage (défaut 6s) ; rendu identique au widget embarqué (fond selon la couleur widget).",
  },
  tides: {
    what: "Widget Marées, Vents & Météo sur une ville côtière.",
    filter: "Ville côtière obligatoire (liste marées) + étape activée dans le Studio.",
    notes: "Durée pilotée par ce réglage (défaut 6s) ; variante affichée selon le filtre marées/vents/météo choisi dans le Studio.",
  },
  hook: {
    what: "Phrase d'accroche (Hook) sur média plein cadre.",
    filter: "Toujours proposée, mais ignorée si le Hook est vide (aucun repli sur la Description).",
    notes: "Une seule carte ; texte auto-réduit si long ; média de fond par rotation ou média assigné via « Ajouter média ».",
  },
  ai_card: {
    what: "Carte IA : synthèse courte générée pour la vidéo.",
    filter: "Incluse seulement si une Carte IA a été générée/cochée dans le Studio.",
    notes: "Rich Text respecté (gras, puces, retours ligne) ; texte auto-réduit pour tenir dans le cadre ; média de fond par rotation ou média assigné via « Ajouter média ».",
  },
  offer: {
    what: "Offre(s) promotionnelle(s) : titre, valeur (% ou montant), mention courte.",
    filter: "Incluse s'il y a au moins une offre sélectionnée.",
    notes: "Plusieurs offres = plusieurs cartes successives ; la durée est répartie par offre ; badge valeur en dégradé or, mention courte en pied de carte.",
  },
  highlight: {
    what: "Blocs highlights (icône/image + titre + texte + métrique).",
    filter: "Incluse s'il y a au moins un highlight rempli et sélectionné.",
    notes: "Une carte par highlight ; Rich Text respecté, texte long auto-réduit, puces sans retour ligne après le symbole ; média de fond par rotation ou média assigné.",
  },
  ai_text: {
    what: "Textes IA de l'onglet TXT IA de Présence en ligne (titre + corps).",
    filter: "Incluse si l'option « TXT IA » est cochée et qu'au moins un texte IA est sélectionné dans le Studio.",
    notes: "Une carte par texte (5s par défaut) ; Rich Text respecté ; média de fond par rotation ou média assigné via « Ajouter média ».",
  },
  external_link: {
    what: "Mise en avant des liens externes / presse de la fiche.",
    filter: "Incluse si au moins un lien externe (documents backoffice, type lien externe) est sélectionné.",
    notes: "Une carte par lien (nom + domaine) ; logo/visuel du média utilisé en repli de fond ; n'utilise jamais les champs url 1 à url 6.",
  },
  menu_doc: {
    what: "Menu / document (carte, flipbook, PDF) avec vignette.",
    filter: "Incluse si au moins un document de type menu/flipbook est sélectionné.",
    notes: "Une carte par document ; ornement décoratif activé ; libellé dédoublonné (« La carte » / « Notre sélection »).",
  },
  media: {
    what: "Zone libre médias : photos et vidéos de l'établissement.",
    filter: "Incluse si des médias sont assignés à l'étape (ou « Ajouter média »).",
    notes: "Un plan par média ; les médias déjà utilisés ailleurs sont évités par rotation ; vidéos lues avec son coupé.",
  },
  reviews: {
    what: "Badge de note agrégée sur 20 + nombre total d'avis clients (moyenne pondérée des 9 plateformes : Google, Tripadvisor, Restaurant Guru, GetYourGuide, Viator, Avis Vérifiés, Trustpilot, Kayak, TourRadar).",
    filter: "Incluse si « Avis clients » est cochée ET qu'une note agrégée ou un nombre d'avis existe (seuil minimum d'avis requis).",
    notes: "Badge doré « note/20 » animé + compteur d'avis qui s'incrémente ; média de fond par rotation ou média assigné.",
  },
  google_review: {
    what: "Avis Google mis en avant : note Google, nombre d'avis Google et extrait de commentaire.",
    filter: "Incluse si une note/un avis Google exploitable est disponible sur la fiche.",
    notes: "Un extrait tronqué proprement en fin de phrase ; logo/mention source Google ; média de fond par rotation.",
  },
  tripadvisor: {
    what: "Avis Tripadvisor : note Tripadvisor, nombre d'avis et extrait éventuel.",
    filter: "Incluse si la fiche a une note et/ou un nombre d'avis Tripadvisor.",
    notes: "Même rendu que la carte Avis Google (mention source Tripadvisor) ; 3s par défaut ; média de fond par rotation.",
  },
  restaurant_guru: {
    what: "Avis Restaurant Guru : note et nombre d'avis Restaurant Guru.",
    filter: "Incluse si la fiche a une note et/ou un nombre d'avis Restaurant Guru.",
    notes: "Même rendu que la carte Avis Google (mention source Restaurant Guru) ; 3s par défaut ; média de fond par rotation.",
  },
  customer_review: {
    what: "Avis client One World Morocco (verbatim sélectionné dans Studio Vidéo IA).",
    filter: "Incluse si un avis client interne est sélectionné dans l'étape.",
    notes: "Citation + auteur + note ; texte tronqué en fin de phrase si trop long ; média de fond par rotation.",
  },

  hours: {
    what: "Horaires d'ouverture de la semaine.",
    filter: "Incluse si « Horaires » est cochée ET que des horaires sont renseignés.",
    notes: "Grille 7 jours compactée, jours fermés grisés ; auto-réduction si beaucoup de créneaux.",
  },
  map: {
    what: "Localisation : carte, quartier, POI de proximité avec flèches et distances.",
    filter: "Incluse si « Localisation » est cochée ET latitude/longitude présentes.",
    notes: "Durée conseillée : 6s pour 1 POI, +1s par POI supplémentaire ; carte centrée sur l'établissement, flèche directionnelle et distance par POI.",
  },
  digital: {
    what: "Carte « ID numérique » (widget type Linktree) avec QR / lien de la fiche.",
    filter: "Incluse si « ID numérique » est cochée ET que la fiche a un slug.",
    notes: "QR code généré à partir de l'URL publique de la fiche ; média de fond par rotation ou média assigné.",
  },
  blog: {
    what: "Articles de blog liés à l'établissement (titre + visuel).",
    filter: "Incluse si « Articles blog » est cochée ET qu'au moins un article est lié.",
    notes: "Une carte par article (titre + image de couverture) ; durée répartie entre les articles.",
  },
  whatsapp: {
    what: "Invitation à contacter par WhatsApp avec le numéro affiché.",
    filter: "Incluse si « WhatsApp » est cochée ET qu'un numéro est renseigné.",
    notes: "Couleur WhatsApp (#25D366) et numéro formaté ; média de fond par rotation ou média assigné.",
  },
  cta: {
    what: "CTA final : installation de l'app / renvoi vers One World Morocco.",
    filter: "Incluse sauf si l'installation de l'app est désactivée.",
    notes: "Placée juste avant l'Outro au montage ; visuel d'établissement en fond ; durée minimale garantie pour éviter une fin noire.",
  },
  outro: {
    what: "Outro : clôture de marque, distincte du CTA final.",
    filter: "Même condition que le CTA final.",
    notes: "Toujours en tout dernier plan ; fond de marque (sans photo d'établissement), logo One World Morocco et signature oneworldmorocco.com.",
  },
  customer_review_note: {
    what: "",
    filter: "",
  },

};

const VideoScenarioConfigPanel = () => {
  const [mode, setMode] = useState<VideoScenarioMode>("business");
  const [steps, setSteps] = useState<VideoScenarioStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("video_scenario_steps")
      .select("id, mode, scene_key, label, position, duration_sec, enabled")
      .eq("mode", mode)
      .order("position", { ascending: true });
    if (error) toast.error("Chargement impossible");
    setSteps(((data ?? []) as VideoScenarioStep[]).slice());
    setDirty(false);
    setLoading(false);
  }, [mode]);

  useEffect(() => {
    load();
  }, [load]);

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= steps.length) return;
    const next = steps.slice();
    [next[index], next[j]] = [next[j], next[index]];
    setSteps(next);
    setDirty(true);
  };

  const patch = (id: string, values: Partial<VideoScenarioStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...values } : s)));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    const rows = steps.map((s, i) => ({
      id: s.id,
      mode: s.mode,
      scene_key: s.scene_key,
      label: s.label,
      position: (i + 1) * 10,
      duration_sec: Math.max(0, Math.min(60, Number(s.duration_sec) || 0)),
      enabled: s.enabled,
    }));
    const { error } = await supabase.from("video_scenario_steps").upsert(rows, { onConflict: "id" });
    setSaving(false);
    if (error) {
      toast.error("Enregistrement échoué");
      return;
    }
    toast.success("Scénario enregistré");
    load();
  };

  const totalFixed = useMemo(
    () => steps.filter((s) => s.enabled).reduce((acc, s) => acc + (Number(s.duration_sec) || 0), 0),
    [steps],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <div>
          <CardTitle className="text-black">Ordre et durées des étapes</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Cet ordre est appliqué dans « Aperçu du scénario » de Studio Vidéo IA. Durée 0 = durée automatique.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {MODES.map((m) => (
            <Button
              key={m.value}
              size="sm"
              variant={mode === m.value ? "default" : "outline"}
              onClick={() => setMode(m.value)}
            >
              {m.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-muted-foreground">
            {steps.filter((s) => s.enabled).length} étape(s) active(s) · durées fixes cumulées : {totalFixed}s
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={load} disabled={loading || saving}>
              <RotateCcw className="h-4 w-4 mr-1" /> Recharger
            </Button>
            <Button size="sm" onClick={save} disabled={!dirty || saving}>
              <Save className="h-4 w-4 mr-1" /> Enregistrer
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune étape configurée pour ce mode.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {steps.map((s, i) => (
              <div key={s.id} className="p-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="w-8 text-xs font-bold tabular-nums text-muted-foreground">{i + 1}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-black">{s.label || s.scene_key}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">{s.scene_key}</span>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    Durée
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={s.duration_sec}
                      onChange={(e) => patch(s.id, { duration_sec: Number(e.target.value) })}
                      className="w-16 h-8 text-xs"
                    />
                    s
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    Actif
                    <Switch checked={s.enabled} onCheckedChange={(v) => patch(s.id, { enabled: v })} />
                  </label>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => move(i, -1)} disabled={i === 0}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => move(i, 1)}
                      disabled={i === steps.length - 1}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              {STEP_DOCS[s.scene_key] && (
                <div className="mt-2 ml-11 space-y-0.5 text-[11px] leading-snug text-muted-foreground max-w-3xl">
                  <p className="text-black/80">{STEP_DOCS[s.scene_key].what}</p>
                  <p>
                    <span className="font-semibold">Filtre :</span> {STEP_DOCS[s.scene_key].filter}
                  </p>
                  {STEP_DOCS[s.scene_key].notes && (
                    <p>
                      <span className="font-semibold">Montage :</span> {STEP_DOCS[s.scene_key].notes}
                    </p>
                  )}
                </div>
              )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoScenarioConfigPanel;
