import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ChevronDown, Loader2 } from "lucide-react";

type AffiliateRightKey =
  | "has_dashboard"
  | "has_video_studio"
  | "has_custom_domain";

const AFFILIATE_RIGHTS: { key: AffiliateRightKey; label: string; locked?: boolean }[] = [
  { key: "has_dashboard", label: "Dashboard" },
  { key: "has_video_studio", label: "Studio" },
  { key: "has_custom_domain", label: "Domaine personnalisé", locked: true },
];

type BusinessRightKey =
  | "has_ai_assistant"
  | "has_blog_export"
  | "has_nearby_widget"
  | "has_email_signature"
  | "has_showcase_site";

const BUSINESS_RIGHTS: { key: BusinessRightKey; label: string; locked?: boolean }[] = [
  { key: "has_ai_assistant", label: "Assistant IA" },
  { key: "has_blog_export", label: "Export d'article de blog" },
  { key: "has_nearby_widget", label: "Adresses à proximité" },
  { key: "has_email_signature", label: "Signature email « Laisser un avis »" },
  { key: "has_showcase_site", label: "Site vitrine 1WM" },
];

interface AffiliateRow {
  id: string;
  name: string;
  is_active: boolean | null;
  [key: string]: any;
}

interface BusinessRow {
  id: string;
  name: string;
  affiliate_id: string | null;
}

type RightsMap = Record<string, Record<BusinessRightKey, boolean>>;

const emptyRights = (): Record<BusinessRightKey, boolean> => ({
  has_ai_assistant: false,
  has_blog_export: false,
  has_nearby_widget: false,
  has_email_signature: true,
  has_showcase_site: false,
});

const AffiliateRightsPanel = () => {
  const [rows, setRows] = useState<AffiliateRow[]>([]);
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [bizRights, setBizRights] = useState<RightsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      const [affRes, bizRes, rightsRes] = await Promise.all([
        supabase
          .from("affiliates")
          .select("id, name, is_active, " + AFFILIATE_RIGHTS.map((r) => r.key).join(", "))
          .order("name"),
        supabase
          .from("businesses")
          .select("id, name, affiliate_id")
          .not("affiliate_id", "is", null)
          .order("name"),
        supabase.from("business_feature_rights").select("*"),
      ]);

      if (affRes.error || bizRes.error || rightsRes.error) {
        toast({
          title: "Erreur de chargement",
          description: (affRes.error || bizRes.error || rightsRes.error)?.message,
          variant: "destructive",
        });
      } else {
        setRows((affRes.data as unknown as AffiliateRow[]) || []);
        setBusinesses((bizRes.data as unknown as BusinessRow[]) || []);
        const map: RightsMap = {};
        ((rightsRes.data as any[]) || []).forEach((r) => {
          map[r.business_id] = {
            has_ai_assistant: !!r.has_ai_assistant,
            has_blog_export: !!r.has_blog_export,
            has_nearby_widget: !!r.has_nearby_widget,
            has_email_signature: r.has_email_signature !== false,
            has_showcase_site: !!r.has_showcase_site,
          };
        });
        setBizRights(map);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.name || "").toLowerCase().includes(q));
  }, [rows, query]);

  const businessesByAffiliate = useMemo(() => {
    const map: Record<string, BusinessRow[]> = {};
    businesses.forEach((b) => {
      if (!b.affiliate_id) return;
      (map[b.affiliate_id] ||= []).push(b);
    });
    return map;
  }, [businesses]);

  const toggle = async (affiliate: AffiliateRow, key: AffiliateRightKey, value: boolean) => {
    setSaving(`${affiliate.id}:${key}`);
    setRows((prev) => prev.map((r) => (r.id === affiliate.id ? { ...r, [key]: value } : r)));
    const { error } = await supabase
      .from("affiliates")
      .update({ [key]: value } as any)
      .eq("id", affiliate.id);
    setSaving(null);
    if (error) {
      setRows((prev) => prev.map((r) => (r.id === affiliate.id ? { ...r, [key]: !value } : r)));
      toast({ title: "Échec de la mise à jour", description: error.message, variant: "destructive" });
    }
  };

  const toggleBusiness = async (businessId: string, key: BusinessRightKey, value: boolean) => {
    const current = bizRights[businessId] || emptyRights();
    const next = { ...current, [key]: value };
    setSaving(`${businessId}:${key}`);
    setBizRights((prev) => ({ ...prev, [businessId]: next }));
    const { error } = await supabase
      .from("business_feature_rights")
      .upsert({ business_id: businessId, ...next } as any, { onConflict: "business_id" });
    setSaving(null);
    if (error) {
      setBizRights((prev) => ({ ...prev, [businessId]: current }));
      toast({ title: "Échec de la mise à jour", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Rechercher un affilié…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((affiliate) => {
          const list = businessesByAffiliate[affiliate.id] || [];
          return (
            <Card key={affiliate.id} className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  <button
                    type="button"
                    onClick={() => setExpanded((p) => ({ ...p, [affiliate.id]: !p[affiliate.id] }))}
                    className="w-full flex items-center justify-between gap-2 text-left"
                  >
                    <span className="truncate">{affiliate.name}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      {affiliate.is_active === false && (
                        <span className="text-xs font-normal text-muted-foreground">inactif</span>
                      )}
                      <span className="text-xs font-normal text-muted-foreground">
                        {list.length} étab.
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${
                          expanded[affiliate.id] ? "rotate-180" : ""
                        }`}
                      />
                    </span>
                  </button>
                </CardTitle>
              </CardHeader>
              {expanded[affiliate.id] && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {AFFILIATE_RIGHTS.map((right) => (
                    <div key={right.key} className="flex items-center justify-between gap-3">
                      <span
                        className={
                          right.locked
                            ? "text-sm text-muted-foreground/50"
                            : "text-sm text-muted-foreground"
                        }
                      >
                        {right.label}
                        {right.locked && (
                          <span className="ml-2 text-xs">(bientôt disponible)</span>
                        )}
                      </span>
                      <Switch
                        checked={!!affiliate[right.key]}
                        disabled={!!right.locked || saving === `${affiliate.id}:${right.key}`}
                        onCheckedChange={(checked) => toggle(affiliate, right.key, checked)}
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-border/50 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Accès par établissement
                  </p>
                  {list.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aucun établissement rattaché.</p>
                  )}
                  {list.map((biz) => {
                    const r = bizRights[biz.id] || emptyRights();
                    return (
                      <div key={biz.id} className="rounded-md border border-border/50 p-3 space-y-2">
                        <p className="text-sm font-medium text-foreground truncate">{biz.name}</p>
                        {BUSINESS_RIGHTS.map((right) => (
                          <div key={right.key} className="flex items-center justify-between gap-3">
                            <span
                              className={
                                right.locked
                                  ? "text-sm text-muted-foreground/50"
                                  : "text-sm text-muted-foreground"
                              }
                            >
                              {right.label}
                              {right.locked && <span className="ml-2 text-xs">(bientôt disponible)</span>}
                            </span>
                            <Switch
                              checked={!!r[right.key]}
                              disabled={!!right.locked || saving === `${biz.id}:${right.key}`}
                              onCheckedChange={(checked) => toggleBusiness(biz.id, right.key, checked)}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
              )}
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun affilié trouvé.</p>
        )}
      </div>

      <div className="pt-6 border-t border-border/50 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Précisions sur les options avancées</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Site vitrine 1WM</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Publication d’une page de présentation dédiée sur one world morocco (nom, photos, offres, avis, contact).
              Activable par établissement.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Domaine personnalisé</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Possibilité de faire pointer un nom de domaine propriétaire vers la vitrine 1WM de l’établissement.
              Option non activable pour l’instant.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffiliateRightsPanel;
