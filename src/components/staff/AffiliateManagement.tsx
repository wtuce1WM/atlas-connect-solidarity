import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, TrendingUp, DollarSign, Plus, Edit, Trash2 } from "lucide-react";

interface Affiliate {
  id: string;
  account_type: string | null;
  name: string;
  ice: string | null;
  kp_regroupement: string | null;
  main_category: string | null;
  whatsapp: string | null;
  phone: string | null;
  contact_email: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  internal_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ACCOUNT_TYPES = [
  { value: "petite_structure", label: "Petite Structure" },
  { value: "structure_moyenne", label: "Structure Moyenne" },
  { value: "grande_structure", label: "Grande Structure" },
  { value: "corporate_branding", label: "Corporate & Branding" },
  { value: "institution", label: "Institution" },
];

const AffiliateManagement = () => {
  const { toast } = useToast();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [categories, setCategories] = useState<{ id: string; name_fr: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    account_type: "",
    name: "",
    ice: "",
    kp_regroupement: "",
    main_category: "",
    whatsapp: "",
    phone: "",
    contact_email: "",
    contact_name: "",
    contact_phone: "",
    internal_notes: "",
    is_active: true,
  });

  useEffect(() => {
    fetchAffiliates();
    fetchCategories();
  }, []);

  const fetchAffiliates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('affiliates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les affiliés.",
      });
      setAffiliates([]);
    } else {
      setAffiliates(data || []);
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name_fr')
      .order('name_fr');
    if (data) setCategories(data);
  };

  const resetForm = () => {
    setFormData({
      account_type: "",
      name: "",
      ice: "",
      kp_regroupement: "",
      main_category: "",
      whatsapp: "",
      phone: "",
      contact_email: "",
      contact_name: "",
      contact_phone: "",
      internal_notes: "",
      is_active: true,
    });
    setEditingAffiliate(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (affiliate: Affiliate) => {
    setEditingAffiliate(affiliate);
    setFormData({
      account_type: affiliate.account_type || "",
      name: affiliate.name,
      ice: affiliate.ice || "",
      kp_regroupement: affiliate.kp_regroupement || "",
      main_category: affiliate.main_category || "",
      whatsapp: affiliate.whatsapp || "",
      phone: affiliate.phone || "",
      contact_email: affiliate.contact_email || "",
      contact_name: affiliate.contact_name || "",
      contact_phone: affiliate.contact_phone || "",
      internal_notes: affiliate.internal_notes || "",
      is_active: affiliate.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le nom est obligatoire.",
      });
      return;
    }

    setSaving(true);

    const affiliateData = {
      account_type: formData.account_type || null,
      name: formData.name.trim(),
      ice: formData.ice?.slice(0, 20) || null,
      kp_regroupement: formData.kp_regroupement?.slice(0, 20) || null,
      main_category: formData.main_category || null,
      whatsapp: formData.whatsapp || null,
      phone: formData.phone || null,
      contact_email: formData.contact_email || null,
      contact_name: formData.contact_name || null,
      contact_phone: formData.contact_phone || null,
      internal_notes: formData.internal_notes || null,
      is_active: formData.is_active,
    };

    let error;
    if (editingAffiliate) {
      const result = await supabase
        .from('affiliates')
        .update(affiliateData)
        .eq('id', editingAffiliate.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('affiliates')
        .insert(affiliateData);
      error = result.error;
    }

    setSaving(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de sauvegarder l'affilié.",
      });
    } else {
      toast({
        title: "Succès",
        description: editingAffiliate ? "Affilié mis à jour." : "Affilié créé.",
      });
      setDialogOpen(false);
      resetForm();
      fetchAffiliates();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet affilié ?")) return;

    const { error } = await supabase
      .from('affiliates')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer l'affilié.",
      });
    } else {
      toast({
        title: "Succès",
        description: "Affilié supprimé.",
      });
      fetchAffiliates();
    }
  };

  const activeCount = affiliates.filter(a => a.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Affiliés</h2>
          <p className="text-muted-foreground">
            Suivez les performances et gérez les partenaires affiliés
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Nouvel affilié
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAffiliate ? "Modifier l'affilié" : "Créer un affilié"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Type de compte */}
              <div className="space-y-2">
                <Label>Type de compte</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Nom Entreprise */}
              <div className="space-y-2">
                <Label htmlFor="name">Nom Entreprise *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nom de l'entreprise affiliée"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ICE */}
                <div className="space-y-2">
                  <Label htmlFor="ice">ICE (max 20 caractères)</Label>
                  <Input
                    id="ice"
                    value={formData.ice}
                    onChange={(e) => setFormData({ ...formData, ice: e.target.value.slice(0, 20) })}
                    placeholder="Identifiant Commun"
                    maxLength={20}
                  />
                </div>

                {/* KP regroupement */}
                <div className="space-y-2">
                  <Label htmlFor="kp_regroupement">KP regroupement (max 20 caractères)</Label>
                  <Input
                    id="kp_regroupement"
                    value={formData.kp_regroupement}
                    onChange={(e) => setFormData({ ...formData, kp_regroupement: e.target.value.slice(0, 20) })}
                    placeholder="Code KP"
                    maxLength={20}
                  />
                </div>
              </div>

              {/* Catégorie principale */}
              <div className="space-y-2">
                <Label>Catégorie principale</Label>
                <Select
                  value={formData.main_category}
                  onValueChange={(value) => setFormData({ ...formData, main_category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name_fr}>
                        {cat.name_fr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* WhatsApp */}
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="+212 6XX-XXXXXX"
                  />
                </div>

                {/* Téléphone entreprise */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone entreprise</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+212 5XX-XXXXXX"
                  />
                </div>
              </div>

              {/* Email de contact */}
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email de contact</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="contact@exemple.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nom du contact */}
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Nom du contact</Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    placeholder="Prénom Nom"
                  />
                </div>

                {/* Téléphone du contact */}
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Téléphone du contact</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="+212 6XX-XXXXXX"
                  />
                </div>
              </div>

              {/* Note interne */}
              <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Label htmlFor="internal_notes" className="text-amber-800">
                  Note interne (staff uniquement)
                </Label>
                <Textarea
                  id="internal_notes"
                  value={formData.internal_notes}
                  onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                  placeholder="Notes internes sur cet affilié..."
                  rows={3}
                />
              </div>

              {/* Actif/Inactif */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Statut</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.is_active ? "L'affilié est actif" : "L'affilié est inactif"}
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingAffiliate ? "Mettre à jour" : "Créer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-muted-foreground text-sm">Affiliés actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-gold/10 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-gold" />
              </div>
              <div>
                <p className="text-2xl font-bold">—</p>
                <p className="text-muted-foreground text-sm">Clics ce mois</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-500/10 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">—</p>
                <p className="text-muted-foreground text-sm">Commissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Affiliates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gold" />
            Liste des Affiliés ({affiliates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : affiliates.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun affilié enregistré pour le moment.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-center">Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliates.map((affiliate) => (
                    <TableRow key={affiliate.id}>
                      <TableCell className="font-medium">
                        {affiliate.name}
                        {affiliate.ice && (
                          <span className="block text-xs text-muted-foreground">
                            ICE: {affiliate.ice}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ACCOUNT_TYPES.find(t => t.value === affiliate.account_type)?.label || affiliate.account_type || "—"}
                      </TableCell>
                      <TableCell>
                        {affiliate.main_category || "—"}
                      </TableCell>
                      <TableCell>
                        {affiliate.contact_name && (
                          <span className="block text-sm">{affiliate.contact_name}</span>
                        )}
                        {affiliate.contact_email && (
                          <span className="block text-xs text-muted-foreground">
                            {affiliate.contact_email}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={affiliate.is_active ? "default" : "secondary"}>
                          {affiliate.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(affiliate)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(affiliate.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateManagement;
