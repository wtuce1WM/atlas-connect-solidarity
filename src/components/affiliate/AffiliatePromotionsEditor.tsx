import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/staff/RichTextEditor";

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
  promotion_note?: string | null;
  savings_amount: number | null;
  sort_order: number;
};

const emptyForm = {
  title_fr: "",
  promotion_message_fr: "",
  promotion_percent: "" as string,
  promotion_value: "" as string,
  promotion_currency: "MAD" as "MAD" | "EUR",
  promotion_note: "" as string,
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
      promotion_note: form.promotion_note.trim() || null,
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
    const parts: string[] = [];
    if (p.promotion_type === "percentage" && p.promotion_value != null) parts.push(`-${p.promotion_value}%`);
    else if (p.promotion_value != null) parts.push(`-${p.promotion_value} ${p.promotion_currency || "MAD"}`);
    if (p.savings_amount != null) parts.push(`-${p.savings_amount} ${p.promotion_currency || "MAD"}`);
    return parts.length ? parts.join(" · ") : null;
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
                    {p.promotion_note && <span className="text-xs italic text-muted-foreground">{p.promotion_note}</span>}
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
        <DialogContent className="max-w-2xl md:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle offre</DialogTitle>
            <DialogDescription>Créez une offre promotionnelle pour cet établissement.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>- %</Label>
                <Input
                  inputMode="numeric"
                  maxLength={5}
                  value={form.promotion_percent}
                  onChange={e => setForm(f => ({ ...f, promotion_percent: e.target.value.replace(/[^\d.,]/g, "").slice(0, 5) }))}
                  placeholder="10"
                />
              </div>
              <div>
                <Label>Valeur</Label>
                <Input
                  inputMode="numeric"
                  maxLength={5}
                  value={form.promotion_value}
                  onChange={e => setForm(f => ({ ...f, promotion_value: e.target.value.replace(/[^\d.,]/g, "").slice(0, 5) }))}
                  placeholder="150"
                />
              </div>
              <div>
                <Label>Devise</Label>
                <div className="flex gap-2 mt-1">
                  {(["MAD", "EUR"] as const).map(c => (
                    <Button
                      key={c}
                      type="button"
                      variant={form.promotion_currency === c ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setForm(f => ({ ...f, promotion_currency: c }))}
                    >
                      {c}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label>Mention courte (optionnel)</Label>
              <Input
                maxLength={40}
                value={form.promotion_note}
                onChange={e => setForm(f => ({ ...f, promotion_note: e.target.value.slice(0, 40) }))}
                placeholder="jusqu'à demain"
              />
              <p className="text-xs text-muted-foreground mt-1">
                « - % » et « Valeur » restent numériques (calculs, badges, tri). La mention courte est un texte libre
                affiché à côté du montant dans les montages vidéo et sur la fiche (ex. « jusqu'à demain », « 2 pers. min »).
              </p>
            </div>

            <div>
              <Label>Titre FR *</Label>
              <Input value={form.title_fr} onChange={e => setForm(f => ({ ...f, title_fr: e.target.value }))} />
            </div>

            <div>
              <Label>Message FR</Label>
              <RichTextEditor
                content={form.promotion_message_fr}
                onChange={(html) => setForm(f => ({ ...f, promotion_message_fr: html }))}
                maxHeight="360px"
                simple
              />
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
