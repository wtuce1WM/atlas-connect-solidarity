import { useState, useEffect } from "react";
import { businessUrl } from "@/lib/businessUrl";
import { Crown, Loader2, LogOut, Save, Bookmark, Trash2, ExternalLink, Tag, Sparkles, Mail } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { User as UserIcon, MapPin, Plane, Lightbulb, Bell } from "lucide-react";
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
  const [bookmarks, setBookmarks] = useState<{ id: string; business_id: string; name: string; city: string | null; main_category: string | null; slug: string | null; promotion: { type: string; value: number; currency: string; message: string | null } | null }[]>([]);
  const [countries, setCountries] = useState<{ id: string; name_fr: string; name_en: string | null; name_ar: string | null; code: string | null }[]>([]);
  const [personas, setPersonas] = useState<{ id: string; slug: string; name_fr: string; name_en: string | null; name_ar: string | null }[]>([]);
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<Set<string>>(new Set());
  const [initialPersonaIds, setInitialPersonaIds] = useState<Set<string>>(new Set());
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
        const [countriesRes, memberRes, bookmarksRes, personasRes] = await Promise.all([
          supabase.from("countries").select("id, name_fr, name_en, name_ar, code").order("sort_order"),
          supabase.from("club_members").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("bookmarks" as any).select("id, business_id").eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("personas" as any).select("id, slug, name_fr, name_en, name_ar").order("sort_order"),
        ]);

        if (countriesRes.data) setCountries(countriesRes.data);
        if (personasRes.data) setPersonas(personasRes.data as any);

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
          // Fetch the member's personas
          const { data: cmpData } = await supabase
            .from("club_member_personas" as any)
            .select("persona_id")
            .eq("member_id", memberRes.data.id);
          const ids = new Set<string>(((cmpData as any[]) || []).map((r: any) => r.persona_id));
          setSelectedPersonaIds(ids);
          setInitialPersonaIds(new Set(ids));
        } else {
          setForm(prev => ({ ...prev, email: user.email || "" }));
        }

        // Fetch business details and promotions for bookmarks
        if (bookmarksRes.data && bookmarksRes.data.length > 0) {
          const bIds = (bookmarksRes.data as any[]).map((b: any) => b.business_id);
          const [bizRes, promoRes] = await Promise.all([
            supabase.from("businesses").select("id, name, city, main_category, slug").in("id", bIds),
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
                slug: biz?.slug || null,
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

      let currentMemberId = memberId;
      if (memberId) {
        const { error } = await supabase
          .from("club_members")
          .update(payload as any)
          .eq("id", memberId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("club_members")
          .insert(payload as any)
          .select("id")
          .single();
        if (error) throw error;
        if (data) {
          setMemberId(data.id);
          currentMemberId = data.id;
        }
      }

      // Sync personas
      if (currentMemberId) {
        const toAdd = [...selectedPersonaIds].filter(id => !initialPersonaIds.has(id));
        const toRemove = [...initialPersonaIds].filter(id => !selectedPersonaIds.has(id));
        if (toRemove.length > 0) {
          await supabase
            .from("club_member_personas" as any)
            .delete()
            .eq("member_id", currentMemberId)
            .in("persona_id", toRemove);
        }
        if (toAdd.length > 0) {
          await supabase
            .from("club_member_personas" as any)
            .insert(toAdd.map(persona_id => ({ member_id: currentMemberId, persona_id })) as any);
        }
        setInitialPersonaIds(new Set(selectedPersonaIds));
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

      <Tabs defaultValue="account" className="w-full" orientation="vertical">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
          <TabsList className="flex md:flex-col h-auto bg-transparent p-0 gap-1 md:items-stretch md:justify-start overflow-x-auto md:overflow-visible">
            {[
              { value: "account", Icon: UserIcon, label: language === "en" ? "My account" : language === "ar" ? "حسابي" : "Mon compte" },
              { value: "addresses", Icon: MapPin, label: language === "en" ? "My places" : language === "ar" ? "عناويني" : "Mes adresses" },
              { value: "travel", Icon: Plane, label: language === "en" ? "Travel" : language === "ar" ? "سفر" : "Voyage" },
              { value: "inspiration", Icon: Lightbulb, label: language === "en" ? "Inspiration" : language === "ar" ? "إلهام" : "Inspiration" },
              { value: "notifications", Icon: Bell, label: language === "en" ? "Notifications" : language === "ar" ? "إشعارات" : "Notifications" },
              { value: "contact", Icon: Mail, label: language === "en" ? "Contact us" : language === "ar" ? "اتصل بنا" : "Contactez-nous" },
            ].map(({ value, Icon, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="w-full justify-start gap-2 px-3 py-2 text-sm rounded-md data-[state=active]:bg-muted data-[state=active]:font-semibold hover:bg-muted/50"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="min-w-0">


        <TabsContent value="account" className="mt-6">
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

        {/* Personas selector */}
        <div className="pt-2">
          <label className="text-sm text-foreground font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            {language === "en" ? "Your traveler profile" : language === "ar" ? "ملفك الشخصي للسفر" : "Votre profil de voyageur"}
          </label>
          <p className="text-xs text-muted-foreground mb-3">
            {language === "en"
              ? "Select one or more personas that match you (optional)."
              : language === "ar"
              ? "اختر شخصية واحدة أو أكثر تناسبك (اختياري)."
              : "Sélectionnez un ou plusieurs personas qui vous correspondent (facultatif)."}
          </p>
          <div className="flex flex-wrap gap-2">
            {personas.map((p) => {
              const selected = selectedPersonaIds.has(p.id);
              const label = language === "en" && p.name_en ? p.name_en : language === "ar" && p.name_ar ? p.name_ar : p.name_fr;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPersonaIds(prev => {
                      const next = new Set(prev);
                      if (next.has(p.id)) next.delete(p.id);
                      else next.add(p.id);
                      return next;
                    });
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selected
                      ? "bg-gold text-black border-gold font-semibold"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              );
            })}
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
        </TabsContent>

        <TabsContent value="addresses" className="mt-6">
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
                  <Link to={businessUrl({ id: bk.business_id, slug: bk.slug })} className="flex-1 min-w-0 hover:underline">
                    <p className="font-medium text-sm truncate">{bk.name}</p>
                    <p className="text-xs text-muted-foreground">{[bk.city, bk.main_category].filter(Boolean).join(" · ")}</p>
                  </Link>
                  <div className="flex items-center gap-1 ml-2">
                    <Link to={businessUrl({ id: bk.business_id, slug: bk.slug })}>
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
        </TabsContent>

        <TabsContent value="travel" className="mt-6">
          <div className="rounded-lg border border-dashed bg-muted/20 p-10 text-center text-sm text-muted-foreground">
            {language === "en" ? "Your travel plans will appear here soon." : language === "ar" ? "ستظهر خطط سفرك هنا قريباً." : "Vos projets de voyage apparaîtront ici prochainement."}
          </div>
        </TabsContent>

        <TabsContent value="inspiration" className="mt-6">
          <div className="rounded-lg border border-dashed bg-muted/20 p-10 text-center text-sm text-muted-foreground">
            {language === "en" ? "Personalized inspiration coming soon." : language === "ar" ? "إلهام شخصي قريباً." : "Inspiration personnalisée bientôt disponible."}
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <div className="rounded-lg border border-dashed bg-muted/20 p-10 text-center text-sm text-muted-foreground">
            {language === "en" ? "No notifications yet." : language === "ar" ? "لا توجد إشعارات بعد." : "Aucune notification pour le moment."}
          </div>
        </TabsContent>

        <TabsContent value="contact" className="mt-6">
          <div className="rounded-lg border bg-background p-6 text-sm space-y-3">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Mail className="h-5 w-5 text-gold" />
              {language === "en" ? "Contact us" : language === "ar" ? "اتصل بنا" : "Contactez-nous"}
            </h3>
            <p className="text-muted-foreground">
              {language === "en"
                ? "A question, a suggestion? Our team is here to help."
                : language === "ar"
                ? "سؤال أو اقتراح؟ فريقنا في خدمتك."
                : "Une question, une suggestion ? Notre équipe est à votre écoute."}
            </p>
            <a
              href="mailto:contact@oneworldmorocco.com"
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              <Mail className="h-4 w-4" />
              contact@oneworldmorocco.com
            </a>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClubDashboard;
