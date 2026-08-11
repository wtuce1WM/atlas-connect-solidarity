import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Package, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
interface ServiceRow {
  id: string;
  name_fr: string;
  subcategory_id: string;
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
  "Vente en ligne",
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
  const [dbServices, setDbServices] = useState<ServiceRow[]>([]);
  const [commoditeOptions, setCommoditeOptions] = useState<string[]>(FALLBACK_COMMODITES);

  const [mainCategory, setMainCategory] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [engagements, setEngagements] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [defaultService, setDefaultService] = useState<string>("");

  const [initial, setInitial] = useState<{ engs: string[]; svcs: string[]; def: string }>({
    engs: [],
    svcs: [],
    def: "",
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [catRes, subRes, svcRes, bizRes, settingsRes] = await Promise.all([
        supabase.from("categories").select("id, name_fr").order("sort_order"),
        supabase.from("subcategories").select("id, name_fr, category_id").order("sort_order"),
        supabase.from("services").select("id, name_fr, subcategory_id").order("sort_order"),
        supabase
          .from("businesses")
          .select("main_category, categories, engagements, services, default_service")
          .eq("id", businessId)
          .maybeSingle(),
        supabase.from("site_settings").select("content").eq("key", "engagement_custom_options_v1").maybeSingle(),
      ]);
      if (cancelled) return;
      if (catRes.data) setDbCategories(catRes.data as CategoryRow[]);
      if (subRes.data) setDbSubcategories(subRes.data as SubcategoryRow[]);
      if (svcRes.data) setDbServices(svcRes.data as ServiceRow[]);

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
      const svcs: string[] = Array.isArray(b.services) ? b.services : [];
      const def: string = b.default_service || "";
      setMainCategory(main);
      setCategories(cats);
      setEngagements(engs);
      setServices(svcs);
      setDefaultService(def);
      setInitial({ engs: [...engs], svcs: [...svcs], def });
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

  const toggleService = (svc: string) => {
    setServices((prev) => {
      if (prev.includes(svc)) {
        if (defaultService === svc) setDefaultService("");
        return prev.filter((s) => s !== svc);
      }
      return [...prev, svc];
    });
  };

  // Group services by subcategory (same logic as the back-office)
  const servicesGroupedBySubcategory = useMemo(() => {
    const selectedSubs = dbSubcategories.filter((sub) => categories.includes(sub.name_fr));
    const groupMap = new Map<string, { subcategoryId: string; subcategoryName: string; serviceNames: Set<string> }>();
    for (const sub of selectedSubs) {
      const svcNames = dbServices.filter((s) => s.subcategory_id === sub.id).map((s) => s.name_fr);
      const existing = groupMap.get(sub.name_fr);
      if (existing) {
        for (const n of svcNames) existing.serviceNames.add(n);
      } else {
        groupMap.set(sub.name_fr, {
          subcategoryId: sub.id,
          subcategoryName: sub.name_fr,
          serviceNames: new Set(svcNames),
        });
      }
    }
    return [...groupMap.values()]
      .map((g) => ({
        subcategoryId: g.subcategoryId,
        subcategoryName: g.subcategoryName,
        services: [...g.serviceNames].sort((a, b) => a.localeCompare(b, "fr")),
      }))
      .filter((g) => g.services.length > 0)
      .sort((a, b) => a.subcategoryName.localeCompare(b.subcategoryName, "fr"));
  }, [dbSubcategories, dbServices, categories]);

  const sameSet = (a: string[], b: string[]) =>
    a.length === b.length && a.every((x) => b.includes(x));

  const isDirty =
    !sameSet(engagements, initial.engs) ||
    !sameSet(services, initial.svcs) ||
    defaultService !== initial.def;

  const handleSave = async () => {
    setSaving(true);
    const cleanDefault = defaultService && services.includes(defaultService) ? defaultService : null;
    const { error } = await supabase
      .from("businesses")
      .update({ engagements, services, default_service: cleanDefault } as any)
      .eq("id", businessId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Services enregistrés ✓" });
      setInitial({ engs: [...engagements], svcs: [...services], def: cleanDefault || "" });
      setDefaultService(cleanDefault || "");
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

      <Tabs defaultValue="commodites" className="space-y-4">
        <TabsList>
          <TabsTrigger value="commodites" className="gap-1.5">
            <Package className="h-3.5 w-3.5" /> Commodités / Logistique
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Services
          </TabsTrigger>
        </TabsList>

        {/* Commodités / Logistique */}
        <TabsContent value="commodites" className="mt-0">
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
        </TabsContent>

        {/* Services */}
        <TabsContent value="services" className="mt-0">
          <div className="space-y-3 p-4 border rounded-lg bg-white/5">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">✨ Services</Label>
              <span className="text-xs text-muted-foreground">{services.length} sélectionné(s)</span>
            </div>

            {servicesGroupedBySubcategory.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Aucun service disponible pour ces sous-catégories.
              </p>
            ) : (
              <Tabs defaultValue={servicesGroupedBySubcategory[0].subcategoryName} className="w-full">
                <TabsList className="w-full flex-wrap h-auto gap-1 bg-background/40">
                  {servicesGroupedBySubcategory.map((group) => {
                    const count = group.services.filter((s) => services.includes(s)).length;
                    return (
                      <TabsTrigger key={group.subcategoryName} value={group.subcategoryName} className="text-sm">
                        {group.subcategoryName}
                        {count > 0 && (
                          <span className="ml-1.5 bg-primary text-primary-foreground rounded-full px-1.5 py-0 text-[10px] font-semibold">
                            {count}
                          </span>
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {servicesGroupedBySubcategory.map((group) => (
                  <TabsContent key={group.subcategoryName} value={group.subcategoryName} className="mt-3">
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() =>
                          setServices((prev) => Array.from(new Set([...prev, ...group.services])))
                        }
                        className="text-xs px-2 py-1 rounded border border-border hover:bg-white/5 transition-colors"
                      >
                        ✅ Tout sélectionner
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const set = new Set(group.services);
                          setServices((prev) => prev.filter((s) => !set.has(s)));
                          if (set.has(defaultService)) setDefaultService("");
                        }}
                        className="text-xs px-2 py-1 rounded border border-border hover:bg-white/5 transition-colors"
                      >
                        ❌ Tout désélectionner
                      </button>
                    </div>
                    <div className="columns-1 md:columns-2 lg:columns-3 gap-3 p-3 border rounded-md bg-background/40">
                      {group.services.map((svc) => (
                        <label
                          key={svc}
                          className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1.5 rounded-md transition-colors break-inside-avoid"
                        >
                          <input
                            type="checkbox"
                            checked={services.includes(svc)}
                            onChange={() => toggleService(svc)}
                            className="h-4 w-4 rounded border-input"
                          />
                          <span className="text-sm">{svc}</span>
                        </label>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}

            {services.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex flex-wrap gap-2">
                  {[...services].sort((a, b) => a.localeCompare(b, "fr")).map((svc) => (
                    <span
                      key={svc}
                      onClick={() => setDefaultService(defaultService === svc ? "" : svc)}
                      title={
                        defaultService === svc
                          ? "Service par défaut (cliquer pour retirer)"
                          : "Cliquer pour définir comme service par défaut"
                      }
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm cursor-pointer ${
                        defaultService === svc
                          ? "bg-primary text-primary-foreground ring-2 ring-primary"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {defaultService === svc && "★ "}
                      {svc}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleService(svc);
                        }}
                        className="hover:text-destructive"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    Cliquez sur un service pour le définir comme service par défaut (★).
                  </p>
                  {defaultService && (
                    <button
                      type="button"
                      onClick={() => setDefaultService("")}
                      className="text-xs text-destructive hover:underline"
                    >
                      Aucun
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

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
