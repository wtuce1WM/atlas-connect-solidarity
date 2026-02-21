import { useState, useEffect } from "react";
import { Crown, Loader2, LogOut, Save, Bookmark, Trash2, ExternalLink, Tag } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

interface ClubDashboardProps {
  user: User;
  onLogout: () => void;
}

const ClubDashboard = ({ user, onLogout }: ClubDashboardProps) => {
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<{ id: string; business_id: string; name: string; city: string | null; main_category: string | null; promotion: { type: string; value: number; currency: string; message: string | null } | null }[]>([]);
  const [countries, setCountries] = useState<{ id: string; name_fr: string; name_en: string | null; name_ar: string | null; code: string | null }[]>([]);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    nickname: "",
    city: "",
    country: "",
    email: "",
    phone: "",
    whatsapp: "",
  });

  const t = {
    fr: {
      title: "Mon espace Club",
      subtitle: "Gérez vos informations personnelles",
      firstName: "Prénom",
      lastName: "Nom",
      nickname: "Pseudonyme",
      cityLabel: "Ville de résidence",
      countryLabel: "Pays de résidence",
      selectCountry: "Sélectionner un pays",
      emailLabel: "Email",
      phoneLabel: "Téléphone",
      whatsappLabel: "WhatsApp",
      save: "Enregistrer",
      saved: "Modifications enregistrées !",
      errorMsg: "Une erreur est survenue, veuillez réessayer.",
      logout: "Se déconnecter",
      required: "* obligatoire",
      memberSince: "Membre depuis",
    },
    en: {
      title: "My Club Space",
      subtitle: "Manage your personal information",
      firstName: "First name",
      lastName: "Last name",
      nickname: "Nickname",
      cityLabel: "City of residence",
      countryLabel: "Country of residence",
      selectCountry: "Select a country",
      emailLabel: "Email",
      phoneLabel: "Phone",
      whatsappLabel: "WhatsApp",
      save: "Save",
      saved: "Changes saved!",
      errorMsg: "An error occurred, please try again.",
      logout: "Log out",
      required: "* required",
      memberSince: "Member since",
    },
    ar: {
      title: "مساحتي في النادي",
      subtitle: "إدارة معلوماتك الشخصية",
      firstName: "الاسم الأول",
      lastName: "اللقب",
      nickname: "الاسم المستعار",
      cityLabel: "مدينة الإقامة",
      countryLabel: "بلد الإقامة",
      selectCountry: "اختر بلداً",
      emailLabel: "البريد الإلكتروني",
      phoneLabel: "الهاتف",
      whatsappLabel: "واتساب",
      save: "حفظ",
      saved: "تم حفظ التغييرات!",
      errorMsg: "حدث خطأ، يرجى المحاولة مرة أخرى.",
      logout: "تسجيل الخروج",
      required: "* مطلوب",
      memberSince: "عضو منذ",
    },
  }[language] || {
    title: "Mon espace Club",
    subtitle: "Gérez vos informations personnelles",
    firstName: "Prénom",
    lastName: "Nom",
    nickname: "Pseudonyme",
    cityLabel: "Ville de résidence",
    countryLabel: "Pays de résidence",
    selectCountry: "Sélectionner un pays",
    emailLabel: "Email",
    phoneLabel: "Téléphone",
      whatsappLabel: "WhatsApp",
    save: "Enregistrer",
    saved: "Modifications enregistrées !",
    errorMsg: "Une erreur est survenue, veuillez réessayer.",
    logout: "Se déconnecter",
    required: "* obligatoire",
    memberSince: "Membre depuis",
  };

  const countryFlag = (code: string | null) => {
    if (!code || code.length !== 2 || !/^[A-Za-z]{2}$/.test(code)) return null;
    return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0)));
  };

  const getCountryName = (c: typeof countries[0]) => {
    if (language === "en" && c.name_en) return c.name_en;
    if (language === "ar" && c.name_ar) return c.name_ar;
    return c.name_fr;
  };

  const priorityCountries = ["Maroc", "France"];
  const sortedCountries = [...countries].sort((a, b) => {
    const aIdx = priorityCountries.indexOf(a.name_fr);
    const bIdx = priorityCountries.indexOf(b.name_fr);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return getCountryName(a).localeCompare(getCountryName(b));
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch countries, member data, and bookmarks in parallel
        const [countriesRes, memberRes, bookmarksRes] = await Promise.all([
          supabase.from("countries").select("id, name_fr, name_en, name_ar, code").order("sort_order"),
          supabase.from("club_members").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("bookmarks" as any).select("id, business_id").eq("user_id", user.id).order("created_at", { ascending: false }),
        ]);

        if (countriesRes.data) setCountries(countriesRes.data);

        if (memberRes.data) {
          setMemberId(memberRes.data.id);
          setForm({
            first_name: memberRes.data.first_name || "",
            last_name: memberRes.data.last_name || "",
            nickname: memberRes.data.nickname || "",
            city: memberRes.data.city || "",
            country: memberRes.data.country || "",
            email: memberRes.data.email || user.email || "",
            phone: memberRes.data.phone || "",
            whatsapp: memberRes.data.whatsapp || "",
          });
        } else {
          setForm(prev => ({ ...prev, email: user.email || "" }));
        }

        // Fetch business details and promotions for bookmarks
        if (bookmarksRes.data && bookmarksRes.data.length > 0) {
          const bIds = (bookmarksRes.data as any[]).map((b: any) => b.business_id);
          const [bizRes, promoRes] = await Promise.all([
            supabase.from("businesses").select("id, name, city, main_category").in("id", bIds),
            supabase.from("affiliate_business_promotions").select("business_id, promotion_type, promotion_value, promotion_currency, promotion_message").in("business_id", bIds),
          ]);
          
          const bizMap = new Map((bizRes.data || []).map(b => [b.id, b]));
          const promoMap = new Map((promoRes.data || []).map(p => [p.business_id, p]));
          setBookmarks(
            (bookmarksRes.data as any[]).map((bk: any) => {
              const biz = bizMap.get(bk.business_id);
              const promo = promoMap.get(bk.business_id);
              return {
                id: bk.id,
                business_id: bk.business_id,
                name: biz?.name || "—",
                city: biz?.city || null,
                main_category: biz?.main_category || null,
                promotion: promo ? { type: promo.promotion_type, value: promo.promotion_value, currency: promo.promotion_currency, message: promo.promotion_message } : null,
              };
            }).filter((bk: any) => bizMap.has(bk.business_id))
          );
        }
      } catch (err) {
        console.error("Error fetching club data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user.id, user.email]);

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.nickname.trim()) return;
    setIsSaving(true);
    try {
      const payload = {
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        nickname: form.nickname.trim(),
        city: form.city.trim() || null,
        country: form.country || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        user_id: user.id,
      };

      if (memberId) {
        // Update existing
        const { error } = await supabase
          .from("club_members")
          .update(payload as any)
          .eq("id", memberId);
        if (error) throw error;
      } else {
        // Create new (Google sign-in user)
        const { data, error } = await supabase
          .from("club_members")
          .insert(payload as any)
          .select("id")
          .single();
        if (error) throw error;
        if (data) setMemberId(data.id);
      }

      toast({ title: t.saved });
    } catch (err) {
      console.error("Save error:", err);
      toast({ title: t.errorMsg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t.title}</h2>
          <p className="text-muted-foreground text-sm">{t.subtitle}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          {t.logout}
        </Button>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">{t.firstName}</label>
            <Input value={form.first_name} onChange={handleChange("first_name")} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">{t.lastName}</label>
            <Input value={form.last_name} onChange={handleChange("last_name")} />
          </div>
        </div>

        <div>
          <label className="text-sm text-foreground font-semibold mb-1 block">
            {t.nickname} <span className="text-destructive">*</span>
          </label>
          <Input value={form.nickname} onChange={handleChange("nickname")} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">{t.cityLabel}</label>
            <Input value={form.city} onChange={handleChange("city")} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">{t.countryLabel}</label>
            <Select
              value={form.country}
              onValueChange={(val) => setForm(prev => ({ ...prev, country: val === "__none__" ? "" : val }))}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={t.selectCountry} />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="__none__">—</SelectItem>
                {sortedCountries.map((c) => {
                  const flag = countryFlag(c.code);
                  const name = getCountryName(c);
                  return (
                    <SelectItem key={c.id} value={name} textValue={name}>
                      <span className="flex items-center gap-2">
                        {flag && <span>{flag}</span>}
                        <span>{name}</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">{t.emailLabel}</label>
          <Input type="email" value={form.email} onChange={handleChange("email")} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">{t.phoneLabel}</label>
            <Input type="tel" value={form.phone} onChange={handleChange("phone")} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">{t.whatsappLabel}</label>
            <Input type="tel" value={form.whatsapp} onChange={handleChange("whatsapp")} />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{t.required}</p>

        <Button
          onClick={handleSave}
          disabled={isSaving || !form.nickname.trim()}
          className="w-full bg-[#25D366] text-white hover:bg-[#20bd5a] font-semibold py-6 text-base"
        >
          {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
          {t.save}
        </Button>
      </div>

      {/* Bookmarks section */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-gold" />
          {language === "en" ? "My saved places" : language === "ar" ? "أماكني المحفوظة" : "Mes adresses sauvegardées"}
        </h3>
        {bookmarks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {language === "en" ? "No saved places yet. Browse the directory and click the bookmark icon to save your favorites!" : language === "ar" ? "لا توجد أماكن محفوظة بعد." : "Aucune adresse sauvegardée. Parcourez l'annuaire et cliquez sur l'icône marque-page pour sauvegarder vos favoris !"}
          </p>
        ) : (
          <div className="space-y-2">
            {bookmarks.map((bk) => (
              <div key={bk.id} className="rounded-lg border bg-background overflow-hidden">
                <div className="flex items-center justify-between p-3">
                  <Link to={`/business/${bk.business_id}`} className="flex-1 min-w-0 hover:underline">
                    <p className="font-medium text-sm truncate">{bk.name}</p>
                    <p className="text-xs text-muted-foreground">{[bk.city, bk.main_category].filter(Boolean).join(" · ")}</p>
                  </Link>
                  <div className="flex items-center gap-1 ml-2">
                    <Link to={`/business/${bk.business_id}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {language === "en" ? "Remove saved place?" : language === "ar" ? "إزالة المكان المحفوظ؟" : "Retirer l'adresse sauvegardée ?"}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {language === "en"
                              ? `Are you sure you want to remove "${bk.name}" from your saved places?`
                              : language === "ar"
                              ? `هل أنت متأكد من إزالة "${bk.name}" من أماكنك المحفوظة؟`
                              : `Êtes-vous sûr de vouloir retirer « ${bk.name} » de vos adresses sauvegardées ?`}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            {language === "en" ? "Cancel" : language === "ar" ? "إلغاء" : "Annuler"}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={async () => {
                              await supabase.from("bookmarks" as any).delete().eq("id", bk.id);
                              setBookmarks(prev => prev.filter(b => b.id !== bk.id));
                            }}
                          >
                            {language === "en" ? "Remove" : language === "ar" ? "إزالة" : "Retirer"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {bk.promotion && (
                  <div className="px-3 pb-3 pt-0">
                    <div className="bg-muted/50 rounded-md p-2.5 border border-dashed border-primary/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Tag className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold text-primary">
                          {bk.promotion.type === "percentage"
                            ? `-${bk.promotion.value}%`
                            : `-${bk.promotion.value} ${bk.promotion.currency}`}
                        </span>
                      </div>
                      {bk.promotion.message && (
                        <div
                          className="text-xs text-muted-foreground prose prose-xs max-w-none [&_p]:m-0 [&_ul]:m-0 [&_li]:m-0"
                          dangerouslySetInnerHTML={{ __html: bk.promotion.message }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubDashboard;
