import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Props {
  businessId: string;
}

interface CategoryRow {
  id: string;
  name_fr: string;
}
interface SubcategoryRow {
  id: string;
  name_fr: string;
  category_id: string;
}

// Fallback list of commodities/logistics options (matches the "Logistique:"
// options in the back-office). Alphabetized on render.
const FALLBACK_COMMODITES = [
  "Accessible aux personnes à mobilité réduite",
  "Adultes seulement",
  "Animaux de compagnie acceptés",
  "Annulez jusqu'à 24h avant pour un remboursement intégral",
  "Assistance 24h/24",
  "Assurance inclue",
  "Climatisation réversible",
  "Cliquez et retirez",
  "Coffre-fort",
  "Commandez 24h à l'avance",
  "Commandez en ligne et recevez votre colis chez vous",
  "Devis gratuit",
  "Disponible 24h/24",
  "Disponible en ligne et en magasin",
  "Échange & retours 365 jours",
  "Enfants de moins de 14 ans non acceptés",
  "Garantie 2 ans",
  "Interdit de fumer",
  "Livraison à domicile",
  "Livraison dans tout le Maroc",
  "Livraison Express",
  "Livraison Glovo",
  "Livraison internationale",
  "Location / Vente",
  "Location possible",
  "Navette gratuite",
  "Ne sert pas d'alcool",
  "Non fumeur",
  "Ouvert 24h/24",
  "Ouvert à la clientèle externe",
  "Paiement à la livraison",
  "Paiement cash",
  "Paiement cash uniquement",
  "Paiement CB",
  "Parking Clients",
  "Prestation à domicile",
  "Privatisation possible",
  "Programme de fidélité",
  "Réservation conseillée",
  "Réservation en ligne obligatoire",
  "Réservation en ligne ou retrait sur place",
  "Réservation obligatoire",
  "Réservé à la clientèle de l'établissement",
  "Réservé aux femmes",
  "Retours gratuits pendant 30 jours",
  "Sans électricité",
  "Service continu",
  "Service sur-mesure",
  "Services à domicile",
  "Sur rendez-vous",
  "Tenue correcte exigée",
  "Transfert aéroport",
  "Uniquement accessible aux visiteurs du jardin",
  "Vente aux professionnels",
  "Web only",
  "WiFi",
];

const AffiliateServicesEditor = ({ businessId }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dbCategories, setDbCategories] = useState<CategoryRow[]>([]);
  const [dbSubcategories, setDbSubcategories] = useState<SubcategoryRow[]>([]);
  const [commoditeOptions, setCommoditeOptions] = useState<string[]>(FALLBACK_COMMODITES);

  const [mainCategory, setMainCategory] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [engagements, setEngagements] = useState<string[]>([]);

  const [initial, setInitial] = useState<{ main: string; cats: string[]; engs: string[] }>({
    main: "",
    cats: [],
    engs: [],
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [catRes, subRes, bizRes, settingsRes] = await Promise.all([
        supabase.from("categories").select("id, name_fr").order("sort_order"),
        supabase.from("subcategories").select("id, name_fr, category_id").order("sort_order"),
        supabase
          .from("businesses")
          .select("main_category, categories, engagements")
          .eq("id", businessId)
          .maybeSingle(),
        supabase.from("site_settings").select("content").eq("key", "engagement_custom_options_v1").maybeSingle(),
      ]);
      if (cancelled) return;
      if (catRes.data) setDbCategories(catRes.data as CategoryRow[]);
      if (subRes.data) setDbSubcategories(subRes.data as SubcategoryRow[]);

      // Merge fallback + global custom commodities
      try {
        const content = (settingsRes.data as any)?.content;
        const parsed = typeof content === "string" ? JSON.parse(content) : content;
        const extra: string[] = Array.isArray(parsed?.commodites) ? parsed.commodites : [];
        const merged = Array.from(new Set([...FALLBACK_COMMODITES, ...extra]))
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, "fr"));
        setCommoditeOptions(merged);
      } catch {
        setCommoditeOptions([...FALLBACK_COMMODITES].sort((a, b) => a.localeCompare(b, "fr")));
      }

      const b = (bizRes.data as any) || {};
      const main = b.main_category || "";
      const cats: string[] = Array.isArray(b.categories) ? b.categories : [];
      const engs: string[] = Array.isArray(b.engagements) ? b.engagements : [];
      setMainCategory(main);
      setCategories(cats);
      setEngagements(engs);
      setInitial({ main, cats: [...cats], engs: [...engs] });
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const toggleCommodite = (com: string) => {
    const val = `Logistique:${com}`;
    setEngagements((prev) =>
      prev.includes(val) ? prev.filter((e) => e !== val) : [...prev, val]
    );
  };

  const isDirty =
    engagements.length !== initial.engs.length ||
    engagements.some((e) => !initial.engs.includes(e));

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("businesses")
      .update({ engagements } as any)
      .eq("id", businessId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Services enregistrés ✓" });
      setInitial({ main: mainCategory, cats: [...categories], engs: [...engagements] });
    }
    setSaving(false);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Catégorie & sous-catégories (lecture seule) */}
      <div className="space-y-4 p-4 border rounded-lg bg-white/5">
        <div className="space-y-2">
          <Label>Catégorie principale</Label>
          <p className="text-sm">
            {mainCategory || <span className="text-muted-foreground italic">Non renseignée</span>}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Sous-catégories</Label>
          {categories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center px-2 py-1 bg-gold/10 text-gold rounded-md text-xs"
                >
                  {cat}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Aucune sous-catégorie.</p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          La catégorie et les sous-catégories sont gérées par l'équipe One World Morocco. Contactez-nous pour toute modification.
        </p>
      </div>



      {/* Commodités / Logistique */}
      <div className="space-y-3 p-4 border rounded-lg bg-white/5">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">📦 Commodités / Logistique</Label>
          <span className="text-xs text-muted-foreground">
            {engagements.filter((e) => e.startsWith("Logistique:")).length} sélectionnée(s)
          </span>
        </div>
        <div className="columns-1 md:columns-2 lg:columns-3 gap-3 p-3 border rounded-md bg-background/40">
          {commoditeOptions.map((com) => {
            const val = `Logistique:${com}`;
            const checked = engagements.includes(val);
            return (
              <label
                key={com}
                className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1.5 rounded-md transition-colors break-inside-avoid"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCommodite(com)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">{com}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!isDirty || saving} className="bg-primary hover:bg-primary/90">
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Enregistrer
        </Button>
      </div>
    </div>
  );
};

export default AffiliateServicesEditor;
