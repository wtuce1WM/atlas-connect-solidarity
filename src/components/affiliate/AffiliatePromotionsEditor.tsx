import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Tag } from "lucide-react";

interface Props {
  businessId: string;
  affiliateId: string;
}

type Promotion = {
  id: string;
  title: string | null;
  title_fr: string | null;
  title_en: string | null;
  title_ar: string | null;
  promotion_message: string | null;
  promotion_message_fr: string | null;
  promotion_message_en: string | null;
  promotion_message_ar: string | null;
  promotion_type: string | null;
  promotion_value: number | null;
  promotion_currency: string | null;
  savings_amount: number | null;
  sort_order: number;
};

const emptyForm = {
  title_fr: "",
  promotion_message_fr: "",
  promotion_percent: "" as string,
  promotion_value: "" as string,
  promotion_currency: "MAD" as "MAD" | "EUR",
};

const AffiliatePromotionsEditor = ({ businessId, affiliateId }: Props) => {
  const { toast } = useToast();
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("affiliate_business_promotions")
      .select("*")
      .eq("business_id", businessId)
      .order("sort_order", { ascending: true });
    setItems((data as Promotion[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [businessId]);

  const handleCreate = async () => {
    if (!form.title_fr.trim()) {
      toast({ title: "Titre requis (FR)", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("affiliate_business_promotions").insert([{
      business_id: businessId,
      affiliate_id: affiliateId,
      title: form.title_fr.trim(),
      title_fr: form.title_fr.trim() || null,
      promotion_message: form.promotion_message_fr || null,
      promotion_message_fr: form.promotion_message_fr || null,
      promotion_type: form.promotion_percent ? "percentage" : "fixed",
      promotion_value: form.promotion_percent ? Number(form.promotion_percent) : null,
      savings_amount: form.promotion_value ? Number(form.promotion_value) : null,
      promotion_currency: form.promotion_currency,
      sort_order: items.length,
    } as any]);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Offre créée ✓" });
    setForm(emptyForm);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("affiliate_business_promotions").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Offre supprimée" });
      setItems(prev => prev.filter(p => p.id !== deleteId));
    }
    setDeleteId(null);
  };

  const formatValue = (p: Promotion) => {
    if (p.promotion_type === "percentage" && p.promotion_value != null) return `-${p.promotion_value}%`;
    if (p.promotion_type === "fixed" && p.promotion_value != null) return `-${p.promotion_value} ${p.promotion_currency || "MAD"}`;
    if (p.savings_amount != null) return `-${p.savings_amount} ${p.promotion_currency || "MAD"}`;
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {items.length} offre{items.length > 1 ? "s" : ""} liée{items.length > 1 ? "s" : ""} à cet établissement
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nouvelle offre
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aucune offre pour cet établissement.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(p => {
            const value = formatValue(p);
            return (
              <div key={p.id} className="flex items-start gap-3 rounded-lg border p-3 bg-card">
                <Tag className="h-4 w-4 mt-0.5 text-[#C04F17] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{p.title_fr || p.title || "(Sans titre)"}</span>
                    {value && <span className="text-[#C04F17] font-bold text-sm">{value}</span>}
                  </div>
                  {(p.promotion_message_fr || p.promotion_message) && (
                    <div
                      className="text-xs text-muted-foreground mt-1 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: p.promotion_message_fr || p.promotion_message || "" }}
                    />
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => setDeleteId(p.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle offre</DialogTitle>
            <DialogDescription>Créez une offre promotionnelle pour cet établissement.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <Label>Type</Label>
                <Select value={form.promotion_type} onValueChange={(v: any) => setForm(f => ({ ...f, promotion_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                    <SelectItem value="fixed">Montant fixe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valeur</Label>
                <Input
                  type="number"
                  value={form.promotion_value}
                  onChange={e => setForm(f => ({ ...f, promotion_value: e.target.value }))}
                  placeholder="10"
                />
              </div>
              <div>
                <Label>Devise</Label>
                <Select value={form.promotion_currency} onValueChange={(v: any) => setForm(f => ({ ...f, promotion_currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MAD">MAD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Titre FR *</Label>
                <Input value={form.title_fr} onChange={e => setForm(f => ({ ...f, title_fr: e.target.value }))} />
              </div>
              <div>
                <Label>Titre EN</Label>
                <Input value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} />
              </div>
              <div>
                <Label>Titre AR</Label>
                <Input dir="rtl" value={form.title_ar} onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Message FR</Label>
                <Textarea rows={3} value={form.promotion_message_fr} onChange={e => setForm(f => ({ ...f, promotion_message_fr: e.target.value }))} />
              </div>
              <div>
                <Label>Message EN</Label>
                <Textarea rows={3} value={form.promotion_message_en} onChange={e => setForm(f => ({ ...f, promotion_message_en: e.target.value }))} />
              </div>
              <div>
                <Label>Message AR</Label>
                <Textarea dir="rtl" rows={3} value={form.promotion_message_ar} onChange={e => setForm(f => ({ ...f, promotion_message_ar: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Créer l'offre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette offre ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AffiliatePromotionsEditor;
