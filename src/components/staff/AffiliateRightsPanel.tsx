import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type RightKey =
  | "has_ai_assistant"
  | "has_blog_export"
  | "has_nearby_widget"
  | "has_email_signature"
  | "has_video_studio"
  | "has_dashboard"
  | "has_guide"
  | "has_showcase_site"
  | "has_custom_domain";

const RIGHTS: { key: RightKey; label: string }[] = [
  { key: "has_ai_assistant", label: "Assistant IA" },
  { key: "has_blog_export", label: "Export d'article de blog" },
  { key: "has_nearby_widget", label: "Adresses à proximité" },
  { key: "has_email_signature", label: "Signature email « Laisser un avis »" },
  { key: "has_video_studio", label: "Studio" },
  { key: "has_dashboard", label: "Dashboard" },
  { key: "has_guide", label: "Guide" },
  { key: "has_showcase_site", label: "Site vitrine 1WM" },
  { key: "has_custom_domain", label: "Domaine personnalisé" },
];

interface AffiliateRow {
  id: string;
  name: string;
  is_active: boolean | null;
  [key: string]: any;
}

const AffiliateRightsPanel = () => {
  const [rows, setRows] = useState<AffiliateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("affiliates")
        .select(
          "id, name, is_active, " + RIGHTS.map((r) => r.key).join(", ")
        )
        .order("name");
      if (error) {
        toast({ title: "Erreur de chargement", description: error.message, variant: "destructive" });
      } else {
        setRows((data as AffiliateRow[]) || []);
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

  const toggle = async (affiliate: AffiliateRow, key: RightKey, value: boolean) => {
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((affiliate) => (
          <Card key={affiliate.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="truncate">{affiliate.name}</span>
                {affiliate.is_active === false && (
                  <span className="text-xs font-normal text-muted-foreground">inactif</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {RIGHTS.map((right) => (
                <div key={right.key} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{right.label}</span>
                  <Switch
                    checked={!!affiliate[right.key]}
                    disabled={saving === `${affiliate.id}:${right.key}`}
                    onCheckedChange={(checked) => toggle(affiliate, right.key, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun affilié trouvé.</p>
        )}
      </div>
    </div>
  );
};

export default AffiliateRightsPanel;
