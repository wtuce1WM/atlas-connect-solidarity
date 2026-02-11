import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Crown, Loader2, Globe, Pencil, Eye } from "lucide-react";

interface KPGroupManagementProps {
  onEditBusiness?: (id: string) => void;
}

interface GroupBusiness {
  id: string;
  name: string;
  city: string;
  neighborhood: string | null;
  is_master: boolean;
  wtuce_status: string | null;
  is_active: boolean;
  website: string | null;
  rating: number | null;
  google_rating: number | null;
  tripadvisor_rating: number | null;
  restaurant_guru_rating: number | null;
}

const computeRating20 = (b: GroupBusiness): number | null => {
  if (b.rating && b.rating > 0) return b.rating;
  const sources: number[] = [];
  if (b.google_rating) sources.push(b.google_rating * 4);
  if (b.tripadvisor_rating) sources.push(b.tripadvisor_rating * 4);
  if (b.restaurant_guru_rating) sources.push(b.restaurant_guru_rating * 4);
  if (sources.length === 0) return null;
  return sources.reduce((a, c) => a + c, 0) / sources.length;
};

interface KPGroup {
  kp: string;
  businesses: GroupBusiness[];
}

const KPGroupManagement = ({ onEditBusiness }: KPGroupManagementProps) => {
  const [groups, setGroups] = useState<KPGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchGroups = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("businesses")
      .select("id, name, city, neighborhood, is_master, wtuce_status, is_active, kp_regroupement, website, rating, google_rating, tripadvisor_rating, restaurant_guru_rating")
      .not("kp_regroupement", "is", null)
      .neq("kp_regroupement", "")
      .order("name");

    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les groupes." });
      setLoading(false);
      return;
    }

    const map = new Map<string, GroupBusiness[]>();
    (data || []).forEach((b: any) => {
      const kp = b.kp_regroupement as string;
      if (!map.has(kp)) map.set(kp, []);
      map.get(kp)!.push({
        id: b.id,
        name: b.name,
        city: b.city,
        neighborhood: b.neighborhood,
        is_master: b.is_master,
        wtuce_status: b.wtuce_status,
        is_active: b.is_active,
        website: b.website,
        rating: b.rating,
        google_rating: b.google_rating,
        tripadvisor_rating: b.tripadvisor_rating,
        restaurant_guru_rating: b.restaurant_guru_rating,
      });
    });

    const grouped: KPGroup[] = [];
    map.forEach((businesses, kp) => {
      if (businesses.length >= 1) {
        businesses.sort((a, b) => (a.is_master === b.is_master ? a.name.localeCompare(b.name) : a.is_master ? -1 : 1));
        grouped.push({ kp, businesses });
      }
    });

    grouped.sort((a, b) => a.kp.localeCompare(b.kp));
    setGroups(grouped);
    setLoading(false);
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const resetMaster = async (kp: string) => {
    setSaving("reset-" + kp);
    const group = groups.find(g => g.kp === kp);
    if (!group) return;

    const ids = group.businesses.map(b => b.id);
    const { error } = await supabase
      .from("businesses")
      .update({ is_master: false } as any)
      .in("id", ids);

    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de réinitialiser." });
      setSaving(null);
      return;
    }

    toast({ title: "Succès", description: "Aucun établissement principal défini." });
    setGroups(prev =>
      prev.map(g => {
        if (g.kp !== kp) return g;
        return {
          ...g,
          businesses: g.businesses
            .map(b => ({ ...b, is_master: false }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        };
      })
    );
    setSaving(null);
  };

  const setMaster = async (kp: string, masterId: string) => {
    setSaving(masterId);
    const group = groups.find(g => g.kp === kp);
    if (!group) return;

    const ids = group.businesses.map(b => b.id);

    const { error: resetError } = await supabase
      .from("businesses")
      .update({ is_master: false } as any)
      .in("id", ids);

    if (resetError) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de mettre à jour." });
      setSaving(null);
      return;
    }

    const { error: setError } = await supabase
      .from("businesses")
      .update({ is_master: true } as any)
      .eq("id", masterId);

    if (setError) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de définir le master." });
      setSaving(null);
      return;
    }

    toast({ title: "Succès", description: "Établissement principal défini." });

    setGroups(prev =>
      prev.map(g => {
        if (g.kp !== kp) return g;
        return {
          ...g,
          businesses: g.businesses
            .map(b => ({ ...b, is_master: b.id === masterId }))
            .sort((a, b) => (a.is_master === b.is_master ? a.name.localeCompare(b.name) : a.is_master ? -1 : 1)),
        };
      })
    );
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucun groupe KP avec plusieurs établissements.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Groupes d&apos;établissements ({groups.length})
        </h2>
      </div>

      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Site web</span>
        <span className="flex items-center gap-1.5"><Pencil className="h-3.5 w-3.5 text-green-600" /> Éditer la fiche</span>
        <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-blue-600" /> Voir la fiche</span>
      </div>

      <div className="space-y-4">
        {groups.map(group => (
          <Card key={group.kp}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {group.kp}
                  </Badge>
                  <span className="text-muted-foreground text-sm">
                    {group.businesses.length} établissements
                  </span>
                </CardTitle>
                {group.businesses.some(b => b.is_master) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={saving !== null}
                    onClick={() => resetMaster(group.kp)}
                  >
                    {saving === "reset-" + group.kp ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : null}
                    Retirer principal
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {group.businesses.map(b => (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      b.is_master ? "border-gold bg-gold/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {b.is_master && <Crown className="h-4 w-4 text-gold flex-shrink-0" />}
                      <div>
                        <span className={`text-sm font-medium ${b.is_master ? "text-gold" : ""}`}>
                          {b.name}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">{b.city}{b.neighborhood ? `, ${b.neighborhood}` : ''}</span>
                        {(() => { const r = computeRating20(b); return r ? (
                          <Badge className="ml-2 bg-muted-foreground/80 text-background text-xs font-semibold border-0">{r.toFixed(1)}/20</Badge>
                        ) : null; })()}
                      </div>
                      {b.wtuce_status === "verified" && (
                        <Badge variant="default" className="text-xs bg-primary/20 text-primary border-primary/30">
                          Vérifié
                        </Badge>
                      )}
                    <div className="flex items-center gap-1.5">
                      {b.website && (
                        <a href={b.website} target="_blank" rel="noopener noreferrer" title="Ouvrir le site web dans un nouvel onglet">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" type="button" asChild>
                            <span><Globe className="h-3.5 w-3.5 text-muted-foreground" /></span>
                          </Button>
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        title="Éditer la fiche dans le backoffice"
                        onClick={() => onEditBusiness?.(b.id)}
                      >
                        <Pencil className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                      <a href={`/business/${b.id}`} target="_blank" rel="noopener noreferrer" title="Voir la fiche publique dans un nouvel onglet">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" type="button" asChild>
                          <span><Eye className="h-3.5 w-3.5 text-blue-600" /></span>
                        </Button>
                      </a>
                    </div>
                    {!b.is_active && (
                      <Badge variant="secondary" className="text-xs">Inactif</Badge>
                    )}
                    </div>
                    <Button
                      size="sm"
                      variant={b.is_master ? "default" : "outline"}
                      className={b.is_master ? "bg-gold text-black hover:bg-gold/80" : ""}
                      disabled={b.is_master || saving !== null}
                      onClick={() => setMaster(group.kp, b.id)}
                    >
                      {saving === b.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : b.is_master ? (
                        <>
                          <Crown className="h-3 w-3 mr-1" />
                          Principal
                        </>
                      ) : (
                        "Définir principal"
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default KPGroupManagement;
