import { useState, useEffect } from "react";
import { Crown, Loader2, LogOut, Save } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch countries and member data in parallel
        const [countriesRes, memberRes] = await Promise.all([
          supabase.from("countries").select("id, name_fr, name_en, name_ar, code").order("sort_order"),
          supabase.from("club_members").select("*").eq("user_id", user.id).maybeSingle(),
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
          // New Google user without club_members row – pre-fill email
          setForm(prev => ({ ...prev, email: user.email || "" }));
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
                {countries.map((c) => {
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
          className="w-full bg-gold text-black hover:bg-gold/90 font-semibold py-6 text-base"
        >
          {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
          {t.save}
        </Button>
      </div>
    </div>
  );
};

export default ClubDashboard;
