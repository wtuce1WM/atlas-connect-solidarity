import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Building2, Loader2, Save, Trash2, Percent, BadgeDollarSign } from "lucide-react";
import RichTextEditor from "./RichTextEditor";

interface Affiliate {
  id: string;
  name: string;
}

interface BusinessWithPromotion {
  business_id: string;
  business_name: string;
  business_city: string | null;
  promotion_id: string | null;
  promotion_type: string;
  promotion_value: number;
  promotion_currency: string;
  promotion_message: string;
  has_changes: boolean;
}

interface AffiliateBusinessesEditorProps {
  affiliate: Affiliate;
  onBack: () => void;
}

const AffiliateBusinessesEditor = ({ affiliate, onBack }: AffiliateBusinessesEditorProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<BusinessWithPromotion[]>([]);

  useEffect(() => {
    fetchBusinessesWithPromotions();
  }, [affiliate.id]);

  const fetchBusinessesWithPromotions = async () => {
    setLoading(true);

    // Fetch businesses linked to this affiliate
    const { data: bizData, error: bizError } = await supabase
      .from("businesses")
      .select("id, name, city")
      .eq("affiliate_id", affiliate.id)
      .order("name");

    if (bizError || !bizData) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les entreprises." });
      setLoading(false);
      return;
    }

    // Fetch existing promotions for this affiliate
    const { data: promoData } = await supabase
      .from("affiliate_business_promotions")
      .select("*")
      .eq("affiliate_id", affiliate.id);

    const promoMap = new Map(
      (promoData || []).map((p: any) => [p.business_id, p])
    );

    const merged: BusinessWithPromotion[] = bizData.map((b) => {
      const promo = promoMap.get(b.id);
      return {
        business_id: b.id,
        business_name: b.name,
        business_city: b.city,
        promotion_id: promo?.id || null,
        promotion_type: promo?.promotion_type || "percentage",
        promotion_value: promo?.promotion_value || 0,
        promotion_currency: promo?.promotion_currency || "MAD",
        promotion_message: promo?.promotion_message || "",
        has_changes: false,
      };
    });

    setBusinesses(merged);
    setLoading(false);
  };

  const updateField = (businessId: string, field: keyof BusinessWithPromotion, value: any) => {
    setBusinesses((prev) =>
      prev.map((b) =>
        b.business_id === businessId ? { ...b, [field]: value, has_changes: true } : b
      )
    );
  };

  const handleSave = async (biz: BusinessWithPromotion) => {
    // Validate message length (strip HTML for counting)
    const plainText = biz.promotion_message.replace(/<[^>]*>/g, "");
    if (plainText.length > 500) {
      toast({ variant: "destructive", title: "Erreur", description: "Le message ne doit pas dépasser 500 caractères." });
      return;
    }

    setSaving(biz.business_id);

    const promoData = {
      affiliate_id: affiliate.id,
      business_id: biz.business_id,
      promotion_type: biz.promotion_type,
      promotion_value: biz.promotion_value,
      promotion_currency: biz.promotion_currency,
      promotion_message: biz.promotion_message || null,
    };

    let error;
    if (biz.promotion_id) {
      const result = await supabase
        .from("affiliate_business_promotions")
        .update(promoData)
        .eq("id", biz.promotion_id);
      error = result.error;
    } else {
      const result = await supabase
        .from("affiliate_business_promotions")
        .insert(promoData)
        .select()
        .single();
      error = result.error;
      if (!error && result.data) {
        setBusinesses((prev) =>
          prev.map((b) =>
            b.business_id === biz.business_id
              ? { ...b, promotion_id: result.data.id, has_changes: false }
              : b
          )
        );
      }
    }

    setSaving(null);

    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder la promotion." });
    } else {
      setBusinesses((prev) =>
        prev.map((b) =>
          b.business_id === biz.business_id ? { ...b, has_changes: false } : b
        )
      );
      toast({ title: "Succès", description: "Promotion sauvegardée." });
    }
  };

  const handleDelete = async (biz: BusinessWithPromotion) => {
    if (!biz.promotion_id) return;
    if (!confirm("Supprimer cette promotion ?")) return;

    const { error } = await supabase
      .from("affiliate_business_promotions")
      .delete()
      .eq("id", biz.promotion_id);

    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer la promotion." });
    } else {
      setBusinesses((prev) =>
        prev.map((b) =>
          b.business_id === biz.business_id
            ? { ...b, promotion_id: null, promotion_type: "percentage", promotion_value: 0, promotion_currency: "MAD", promotion_message: "", has_changes: false }
            : b
        )
      );
      toast({ title: "Succès", description: "Promotion supprimée." });
    }
  };

  return (
    <div className="space-y-6">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-muted py-4 -mx-4 px-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux affiliés
          </Button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Entreprises de {affiliate.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              Gérez les promotions pour chaque entreprise affiliée ({businesses.length})
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : businesses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucune entreprise n'est rattachée à cet affilié.
          </CardContent>
        </Card>
      ) : (
        businesses.map((biz) => {
          const plainTextLength = biz.promotion_message.replace(/<[^>]*>/g, "").length;
          return (
            <Card key={biz.business_id} className={biz.has_changes ? "border-primary/50" : ""}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div>
                    <span className="font-semibold">{biz.business_name}</span>
                    {biz.business_city && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        — {biz.business_city}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {biz.promotion_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(biz)}
                        title="Supprimer la promotion"
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleSave(biz)}
                      disabled={saving === biz.business_id || !biz.has_changes}
                    >
                      {saving === biz.business_id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Sauvegarder
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Promotion type */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      {biz.promotion_type === "percentage" ? (
                        <Percent className="h-3.5 w-3.5" />
                      ) : (
                        <BadgeDollarSign className="h-3.5 w-3.5" />
                      )}
                      Type de promotion
                    </Label>
                    <Select
                      value={biz.promotion_type}
                      onValueChange={(v) => updateField(biz.business_id, "promotion_type", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                        <SelectItem value="fixed">Montant fixe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Promotion value */}
                  <div className="space-y-2">
                    <Label>
                      {biz.promotion_type === "percentage" ? "Réduction (%)" : "Montant"}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={biz.promotion_type === "percentage" ? 100 : undefined}
                      value={biz.promotion_value}
                      onChange={(e) =>
                        updateField(biz.business_id, "promotion_value", parseFloat(e.target.value) || 0)
                      }
                      placeholder={biz.promotion_type === "percentage" ? "Ex: 15" : "Ex: 200"}
                    />
                  </div>

                  {/* Currency (only for fixed) */}
                  {biz.promotion_type === "fixed" && (
                    <div className="space-y-2">
                      <Label>Devise</Label>
                      <Select
                        value={biz.promotion_currency}
                        onValueChange={(v) => updateField(biz.business_id, "promotion_currency", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MAD">MAD (Dirham)</SelectItem>
                          <SelectItem value="EUR">EUR (Euro)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Promotion message */}
                <div className="space-y-2">
                  <Label className="flex items-center justify-between">
                    <span>Message promotionnel</span>
                    <span className={`text-xs ${plainTextLength > 500 ? "text-destructive" : "text-muted-foreground"}`}>
                      {plainTextLength}/500 caractères
                    </span>
                  </Label>
                  <RichTextEditor
                    content={biz.promotion_message}
                    onChange={(html) => updateField(biz.business_id, "promotion_message", html)}
                    placeholder="Décrivez la promotion..."
                    maxHeight="200px"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default AffiliateBusinessesEditor;
