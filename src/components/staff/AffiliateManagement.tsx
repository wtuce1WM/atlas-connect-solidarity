import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AffiliateBusinessesEditor from "./AffiliateBusinessesEditor";
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
import { Loader2, Users, TrendingUp, DollarSign, Plus, Edit, Trash2, Key, UserPlus, UserX, Eye, EyeOff, Building2, BarChart3, Copy, RefreshCw, MessageCircle, Mail } from "lucide-react";
import BusinessAnalyticsPanel from "@/components/affiliate/BusinessAnalyticsPanel";


interface Affiliate {
  id: string;
  account_type: string | null;
  name: string;
  ice: string | null;
  kp_regroupement: string | null;
  main_category: string | null;
  country_id: string;
  whatsapp: string | null;
  phone: string | null;
  contact_email: string | null;
  contact_url: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  internal_notes?: string | null;
  is_active: boolean;
  user_id: string | null;
  max_businesses: number | null;
  has_video_studio: boolean | null;
  has_dashboard: boolean | null;
  has_guide: boolean | null;
  created_at: string;
  updated_at: string;
}

const ACCOUNT_TYPES = [
  { value: "association", label: "Association" },
  { value: "corporate_branding", label: "Corporate & Branding" },
  { value: "grande_structure", label: "Grande Structure" },
  { value: "institution", label: "Institution" },
  { value: "petite_structure", label: "Petite Structure" },
  { value: "structure_moyenne", label: "Structure Moyenne" },
];

interface AffiliateManagementProps {
  onViewAffiliateBusinesses?: (affiliateId: string) => void;
}

const AffiliateManagement = ({ onViewAffiliateBusinesses }: AffiliateManagementProps) => {
  const { toast } = useToast();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [categories, setCategories] = useState<{ id: string; name_fr: string }[]>([]);
  const [countries, setCountries] = useState<{ id: string; name_fr: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accountAction, setAccountAction] = useState<"create" | "reset_password" | "delete">("create");
  const [welcomeAffiliate, setWelcomeAffiliate] = useState<Affiliate | null>(null);
  const [welcomeSending, setWelcomeSending] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [editingBusinessesAffiliate, setEditingBusinessesAffiliate] = useState<Affiliate | null>(null);
  const [analyticsAffiliate, setAnalyticsAffiliate] = useState<Affiliate | null>(null);

  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    account_type: "",
    name: "",
    ice: "",
    kp_regroupement: "",
    main_category: "",
    country_id: "",
    whatsapp: "",
    phone: "",
    contact_email: "",
    contact_url: "",
    contact_name: "",
    contact_phone: "",
    internal_notes: "",
    max_businesses: "",
    has_video_studio: false,
    has_dashboard: false,
    has_guide: false,
    has_showcase_site: false,
    has_custom_domain: false,
    is_active: true,
  });

  useEffect(() => {
    fetchAffiliates();
    fetchCategories();
    fetchCountries();
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

  const fetchCountries = async () => {
    const { data } = await supabase
      .from('countries')
      .select('id, name_fr')
      .order('name_fr');
    if (data) setCountries(data);
  };

  const resetForm = () => {
    setFormData({
      account_type: "",
      name: "",
      ice: "",
      kp_regroupement: "",
      main_category: "",
      country_id: countries.length > 0 ? countries[0].id : "",
      whatsapp: "",
      phone: "",
      contact_email: "",
      contact_url: "",
      contact_name: "",
      contact_phone: "",
      internal_notes: "",
      max_businesses: "",
      has_video_studio: false,
      has_dashboard: false,
      has_guide: false,
      has_showcase_site: false,
      has_custom_domain: false,
      is_active: true,
    });
    setEditingAffiliate(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = async (affiliate: Affiliate) => {
    setEditingAffiliate(affiliate);
    const { data: noteRow } = await supabase
      .from('affiliate_internal_notes')
      .select('notes')
      .eq('affiliate_id', affiliate.id)
      .maybeSingle();
    setFormData({
      account_type: affiliate.account_type || "",
      name: affiliate.name,
      ice: affiliate.ice || "",
      kp_regroupement: affiliate.kp_regroupement || "",
      main_category: affiliate.main_category || "",
      country_id: affiliate.country_id,
      whatsapp: affiliate.whatsapp || "",
      phone: affiliate.phone || "",
      contact_email: affiliate.contact_email || "",
      contact_url: (affiliate as any).contact_url || "",
      contact_name: affiliate.contact_name || "",
      contact_phone: affiliate.contact_phone || "",
      internal_notes: noteRow?.notes || "",
      max_businesses: affiliate.max_businesses?.toString() ?? "",
      has_video_studio: affiliate.has_video_studio ?? false,
      has_dashboard: affiliate.has_dashboard ?? false,
      has_guide: (affiliate as any).has_guide ?? false,
      has_showcase_site: (affiliate as any).has_showcase_site ?? false,
      has_custom_domain: (affiliate as any).has_custom_domain ?? false,
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

    if (!formData.country_id) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le pays est obligatoire.",
      });
      return;
    }

    setSaving(true);

    const maxBiz = formData.max_businesses.trim();
    const numericMaxBiz = maxBiz === "" ? null : Math.min(99, Math.max(0, parseInt(maxBiz, 10) || 0));

    const affiliateData = {
      account_type: formData.account_type || null,
      name: formData.name.trim(),
      ice: formData.ice?.slice(0, 20) || null,
      kp_regroupement: formData.kp_regroupement?.slice(0, 20) || null,
      main_category: formData.main_category || null,
      country_id: formData.country_id,
      whatsapp: formData.whatsapp || null,
      phone: formData.phone || null,
      contact_email: formData.contact_email || null,
      contact_url: formData.contact_url || null,
      contact_name: formData.contact_name || null,
      contact_phone: formData.contact_phone || null,
      is_active: formData.is_active,
      max_businesses: numericMaxBiz,
      has_video_studio: formData.has_video_studio,
      has_dashboard: formData.has_dashboard,
      has_guide: formData.has_guide,
      has_showcase_site: (formData as any).has_showcase_site ?? false,
      has_custom_domain: (formData as any).has_custom_domain ?? false,
    };

    let error;
    let affiliateId = editingAffiliate?.id;
    if (editingAffiliate) {
      const result = await supabase
        .from('affiliates')
        .update(affiliateData)
        .eq('id', editingAffiliate.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('affiliates')
        .insert(affiliateData)
        .select('id')
        .single();
      error = result.error;
      affiliateId = result.data?.id;
    }

    if (!error && affiliateId) {
      const notes = formData.internal_notes?.trim() || null;
      if (notes) {
        await supabase
          .from('affiliate_internal_notes')
          .upsert({ affiliate_id: affiliateId, notes }, { onConflict: 'affiliate_id' });
      } else {
        await supabase
          .from('affiliate_internal_notes')
          .delete()
          .eq('affiliate_id', affiliateId);
      }
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
    if (!confirm("Supprimer cet affilié ? Ses établissements ne seront PAS supprimés (juste déliés).")) return;

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

  const sendWelcomeEmail = async () => {
    if (!welcomeAffiliate) return;
    setWelcomeSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-affiliate-welcome", {
        body: { affiliate_id: welcomeAffiliate.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({
        title: "Email envoyé",
        description: `Invitation envoyée à ${(data as any)?.email || welcomeAffiliate.contact_email}.`,
      });
      setWelcomeAffiliate(null);
      fetchAffiliates();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Envoi impossible.",
        variant: "destructive",
      });
    } finally {
      setWelcomeSending(false);
    }
  };

  // Account management functions
  const openAccountDialog = (affiliate: Affiliate, action: "create" | "reset_password" | "delete") => {
    setSelectedAffiliate(affiliate);
    setAccountAction(action);
    setAccountEmail(affiliate.contact_email || "");
    setAccountPassword("");
    setShowPassword(false);
    setAccountDialogOpen(true);
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let pwd = "";
    const arr = new Uint32Array(14);
    crypto.getRandomValues(arr);
    for (let i = 0; i < arr.length; i++) pwd += chars[arr[i] % chars.length];
    setAccountPassword(pwd);
    setShowPassword(true);
  };

  const copyPassword = async () => {
    if (!accountPassword) return;
    try {
      await navigator.clipboard.writeText(accountPassword);
      toast({ title: "Copié", description: "Mot de passe copié dans le presse-papier." });
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Copie impossible." });
    }
  };

  const sendWhatsApp = () => {
    if (!selectedAffiliate || !accountPassword) return;
    const phone = (selectedAffiliate.whatsapp || selectedAffiliate.contact_phone || selectedAffiliate.phone || "").replace(/[^\d]/g, "");
    const email = accountEmail || selectedAffiliate.contact_email || "";
    const msg = `Bonjour ${selectedAffiliate.name},\n\nVoici vos identifiants One World Morocco :\nEmail : ${email}\nMot de passe : ${accountPassword}\n\nConnexion : https://oneworldmorocco.com/affiliates/login\n\nMerci de le changer après votre première connexion.`;
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const handleAccountAction = async () => {

    if (!selectedAffiliate) return;

    if (accountAction === "create" && (!accountEmail || !accountPassword)) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "L'email et le mot de passe sont requis.",
      });
      return;
    }

    if (accountAction === "reset_password" && !accountPassword) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le nouveau mot de passe est requis.",
      });
      return;
    }

    if ((accountAction === "create" || accountAction === "reset_password") && accountPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères.",
      });
      return;
    }

    setAccountLoading(true);

    try {
      const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
      const { data: sessionData } = refreshedSession.session
        ? { data: refreshedSession }
        : await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (refreshError || !token) {
        throw new Error("Session staff expirée. Reconnecte-toi au back-office puis réessaie.");
      }

      const response = await supabase.functions.invoke("manage-affiliate-user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: {
          action: accountAction,
          affiliate_id: selectedAffiliate.id,
          email: accountEmail,
          password: accountPassword,
        },
      });

      if (response.error) {
        // Try to extract the actual error message from the response body
        let detailedMessage = response.error.message || "Erreur lors de l'opération";
        try {
          const functionError = response.error as {
            context?: {
              json?: () => Promise<unknown>;
              text?: () => Promise<string>;
            };
          };
          const ctx = functionError.context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (
              body &&
              typeof body === "object" &&
              "error" in body &&
              typeof body.error === "string"
            ) {
              detailedMessage = body.error;
            }
          } else if (ctx && typeof ctx.text === "function") {
            const txt = await ctx.text();
            const parsed = JSON.parse(txt);
            if (parsed?.error) detailedMessage = parsed.error;
          }
        } catch (_) {
          // ignore parse errors, keep generic message
        }
        throw new Error(detailedMessage);
      }

      const result = response.data;

      if (result?.error) {
        throw new Error(result.error);
      }

      const successMessages = {
        create: "Compte affilié créé avec succès.",
        reset_password: "Mot de passe réinitialisé avec succès.",
        delete: "Compte affilié supprimé avec succès.",
      };

      toast({
        title: "Succès",
        description: successMessages[accountAction],
      });

      setAccountDialogOpen(false);
      fetchAffiliates();
    } catch (error: unknown) {
      let errorMessage = error instanceof Error ? error.message : "Une erreur est survenue.";
      
      // Translate common error messages
      if (errorMessage.includes("already registered")) {
        errorMessage = "Cet email est déjà utilisé par un autre compte.";
      } else if (errorMessage.includes("already has an account")) {
        errorMessage = "Cet affilié a déjà un compte utilisateur.";
      } else if (errorMessage.includes("does not have an account")) {
        errorMessage = "Cet affilié n'a pas encore de compte utilisateur.";
      }

      toast({
        variant: "destructive",
        title: "Erreur",
        description: errorMessage,
      });
    } finally {
      setAccountLoading(false);
    }
  };

  const activeCount = affiliates.filter(a => a.is_active).length;

  if (editingBusinessesAffiliate) {
    return (
      <AffiliateBusinessesEditor
        affiliate={editingBusinessesAffiliate}
        onBack={() => setEditingBusinessesAffiliate(null)}
      />
    );
  }

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

              {/* Pays */}
              <div className="space-y-2">
                <Label>Pays *</Label>
                <Select
                  value={formData.country_id}
                  onValueChange={(value) => setFormData({ ...formData, country_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un pays..." />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.id} value={country.id}>
                        {country.name_fr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

                {/* Ets max */}
                <div className="space-y-2">
                  <Label htmlFor="max_businesses">Ets (max 99)</Label>
                  <Input
                    id="max_businesses"
                    type="number"
                    min={0}
                    max={99}
                    value={formData.max_businesses}
                    onChange={(e) => setFormData({ ...formData, max_businesses: e.target.value })}
                    placeholder="Ex. 5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Studio Vidéo */}
                <div className="flex items-center justify-between space-y-0 rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="has_video_studio">Studio Vidéo</Label>
                    <p className="text-xs text-muted-foreground">Accès au studio vidéo</p>
                  </div>
                  <Switch
                    id="has_video_studio"
                    checked={formData.has_video_studio}
                    onCheckedChange={(checked) => setFormData({ ...formData, has_video_studio: checked })}
                  />
                </div>

                {/* Dashboard */}
                <div className="flex items-center justify-between space-y-0 rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="has_dashboard">Dashboard</Label>
                    <p className="text-xs text-muted-foreground">Accès au tableau de bord</p>
                  </div>
                  <Switch
                    id="has_dashboard"
                    checked={formData.has_dashboard}
                    onCheckedChange={(checked) => setFormData({ ...formData, has_dashboard: checked })}
                  />
                </div>

                {/* Guide */}
                <div className="flex items-center justify-between space-y-0 rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="has_guide">Guide</Label>
                    <p className="text-xs text-muted-foreground">Accès au Guide</p>
                  </div>
                  <Switch
                    id="has_guide"
                    checked={formData.has_guide}
                    onCheckedChange={(checked) => setFormData({ ...formData, has_guide: checked })}
                  />
                </div>

                {/* Site vitrine */}
                <div className="flex items-center justify-between space-y-0 rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="has_showcase_site">Site vitrine 1WM</Label>
                    <p className="text-xs text-muted-foreground">Page /site/:slug signée 1WM</p>
                  </div>
                  <Switch
                    id="has_showcase_site"
                    checked={(formData as any).has_showcase_site || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, has_showcase_site: checked } as any)}
                  />
                </div>

                {/* Domaine personnalisé */}
                <div className="flex items-center justify-between space-y-0 rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="has_custom_domain">Domaine personnalisé</Label>
                    <p className="text-xs text-muted-foreground">Autorise l'édition du champ « Domaine personnalisé » (setup manuel)</p>
                  </div>
                  <Switch
                    id="has_custom_domain"
                    checked={(formData as any).has_custom_domain || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, has_custom_domain: checked } as any)}
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

              {/* URL liée à l'établissement */}
              <div className="space-y-2">
                <Label htmlFor="contact_url">URL</Label>
                <Input
                  id="contact_url"
                  type="url"
                  value={formData.contact_url}
                  onChange={(e) => setFormData({ ...formData, contact_url: e.target.value })}
                  placeholder="https://exemple.com"
                />
                <p className="text-xs text-muted-foreground">URL liée à l'établissement</p>
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

        {/* Account Management Dialog */}
        <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {accountAction === "create" && "Créer un compte affilié"}
                {accountAction === "reset_password" && "Réinitialiser le mot de passe"}
                {accountAction === "delete" && "Supprimer le compte affilié"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedAffiliate && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{selectedAffiliate.name}</p>
                  {selectedAffiliate.contact_email && (
                    <p className="text-sm text-muted-foreground">{selectedAffiliate.contact_email}</p>
                  )}
                </div>
              )}

              {accountAction === "create" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="account_email">Email du compte *</Label>
                    <Input
                      id="account_email"
                      type="email"
                      value={accountEmail}
                      onChange={(e) => setAccountEmail(e.target.value)}
                      placeholder="email@exemple.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_password">Mot de passe *</Label>
                    <div className="relative">
                      <Input
                        id="account_password"
                        type={showPassword ? "text" : "password"}
                        value={accountPassword}
                        onChange={(e) => setAccountPassword(e.target.value)}
                        placeholder="Minimum 6 caractères"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={generatePassword}>
                        <RefreshCw className="h-3 w-3 mr-1" /> Générer
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={copyPassword} disabled={!accountPassword}>
                        <Copy className="h-3 w-3 mr-1" /> Copier
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={sendWhatsApp} disabled={!accountPassword} className="text-green-600">
                        <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                      </Button>
                    </div>
                  </div>

                </>
              )}

              {accountAction === "reset_password" && (
                <div className="space-y-2">
                  <Label htmlFor="new_password">Nouveau mot de passe *</Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      type={showPassword ? "text" : "password"}
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      placeholder="Minimum 6 caractères"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={generatePassword}>
                      <RefreshCw className="h-3 w-3 mr-1" /> Générer
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={copyPassword} disabled={!accountPassword}>
                      <Copy className="h-3 w-3 mr-1" /> Copier
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={sendWhatsApp} disabled={!accountPassword} className="text-green-600">
                      <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Les mots de passe existants sont chiffrés et ne peuvent pas être récupérés — génère un nouveau mot de passe pour l'envoyer.
                  </p>
                </div>

              )}

              {accountAction === "delete" && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">
                    Êtes-vous sûr de vouloir supprimer le compte utilisateur de cet affilié ? 
                    L'affilié ne pourra plus se connecter. Cette action est irréversible.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setAccountDialogOpen(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleAccountAction} 
                  disabled={accountLoading}
                  variant={accountAction === "delete" ? "destructive" : "default"}
                >
                  {accountLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {accountAction === "create" && "Créer le compte"}
                  {accountAction === "reset_password" && "Réinitialiser"}
                  {accountAction === "delete" && "Supprimer le compte"}
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

      {/* Help Section */}
      <div className="p-4 bg-muted/50 border rounded-lg space-y-2">
        <p className="font-medium text-sm">Gestion des comptes affiliés :</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-green-600" />
            <span><strong>Créer un compte</strong> : bouton vert visible quand l'affilié n'a pas encore d'identifiants.</span>
          </li>
          <li className="flex items-center gap-2">
            <Key className="h-4 w-4 text-amber-600" />
            <span><strong>Réinitialiser le mot de passe</strong> : bouton clé orange pour changer le mot de passe d'un compte existant.</span>
          </li>
          <li className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-red-600" />
            <span><strong>Supprimer le compte</strong> : bouton rouge pour révoquer l'accès (l'affilié reste dans la base).</span>
          </li>
        </ul>
        <p className="text-xs text-muted-foreground pt-1">
          La colonne "Statut" indique si la fiche affiliée est activée ou désactivée dans la base.
        </p>
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
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Ets</TableHead>
                      <TableHead>Studio</TableHead>
                      <TableHead>Dashboard</TableHead>
                      <TableHead>Guide</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-center">Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliates.map((affiliate) => (
                   <TableRow key={affiliate.id}>
                      <TableCell className="p-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingBusinessesAffiliate(affiliate)}
                          title="Voir les entreprises de cet affilié"
                          className="h-8 w-8"
                        >
                          <Building2 className="h-4 w-4 text-primary" />
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        {affiliate.name}
                        {affiliate.ice && (
                          <span className="block text-xs text-muted-foreground">
                            ICE: {affiliate.ice}
                          </span>
                        )}
                      </TableCell>
                       <TableCell className="text-center">
                         {affiliate.max_businesses ?? "—"}
                       </TableCell>
                       <TableCell className="text-center">
                         {affiliate.has_video_studio ? (
                           <Badge variant="default" className="bg-green-600">Oui</Badge>
                         ) : (
                           <Badge variant="outline" className="text-muted-foreground">Non</Badge>
                         )}
                       </TableCell>
                       <TableCell className="text-center">
                         {affiliate.has_dashboard ? (
                           <Badge variant="default" className="bg-green-600">Oui</Badge>
                         ) : (
                           <Badge variant="outline" className="text-muted-foreground">Non</Badge>
                         )}
                       </TableCell>
                       <TableCell className="text-center">
                         {(affiliate as any).has_guide ? (
                           <Badge variant="default" className="bg-green-600">Oui</Badge>
                         ) : (
                           <Badge variant="outline" className="text-muted-foreground">Non</Badge>
                         )}
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
                        <div className="flex justify-end gap-1">
                          {/* Account management buttons */}
                          {affiliate.user_id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openAccountDialog(affiliate, "reset_password")}
                                title="Réinitialiser le mot de passe"
                              >
                                <Key className="h-4 w-4 text-amber-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openAccountDialog(affiliate, "delete")}
                                title="Supprimer le compte"
                              >
                                <UserX className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openAccountDialog(affiliate, "create")}
                              title="Créer un compte"
                            >
                              <UserPlus className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setWelcomeAffiliate(affiliate)}
                            title="Envoyer l'email de bienvenue (création de mot de passe)"
                            disabled={!affiliate.contact_email}
                          >
                            <Mail className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAnalyticsAffiliate(affiliate)}
                            title="Voir les statistiques"
                          >
                            <BarChart3 className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(affiliate)}
                            title="Modifier l'affilié"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(affiliate.id)}
                            title="Supprimer l'affilié (les établissements sont préservés)"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
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

      <Dialog open={!!analyticsAffiliate} onOpenChange={(o) => !o && setAnalyticsAffiliate(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Analytics — {analyticsAffiliate?.name}
            </DialogTitle>
          </DialogHeader>
          {analyticsAffiliate && (
            <BusinessAnalyticsPanel affiliateId={analyticsAffiliate.id} />
          )}
        </DialogContent>
      </Dialog>
    </div>

  );
};

export default AffiliateManagement;
