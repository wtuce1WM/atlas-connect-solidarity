import { useState, useEffect, useRef } from "react";
import { businessUrl } from "@/lib/businessUrl";
import digitalIdCardAsset from "@/assets/digital-id-card.webp.asset.json";
import { Crown, Loader2, LogOut, Save, Bookmark, Trash2, ExternalLink, Tag, Sparkles, Mail } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { User as UserIcon, MapPin, Plane, Lightbulb, Bell, Home, Bot } from "lucide-react";
import ClubTrips from "@/components/club/ClubTrips";
import BookmarkTripLinker from "@/components/club/BookmarkTripLinker";
import ClubAiAssistant from "@/components/club/ClubAiAssistant";
import AiChatsList from "@/components/club/AiChatsList";
import { MessageCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Link, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { withLangPrefix } from "@/lib/localizedPath";
import type { User } from "@supabase/supabase-js";
import logoHamsa from "@/assets/logo-hamsa-gold.png";
import accountAvatar from "@/assets/default-avatar.png";
import RichTextEditor from "@/components/staff/RichTextEditor";
import { SOCIAL_ICONS } from "@/lib/socialIcons";
import ShareButton from "@/components/ShareButton";
import hamsaBlueAsset from "@/assets/hamsa-wall-blue.webp.asset.json";

const MAX_DESCRIPTION_LENGTH = 200;
const plainTextLength = (html: string) => {
  if (!html) return 0;
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || "").replace(/\s+/g, " ").trim().length;
};


interface ClubDashboardProps {
  user: User;
  onLogout: () => void;
}

const ClubDashboard = ({ user, onLogout }: ClubDashboardProps) => {
  const { language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const ALLOWED_TABS = ["assistant","account","addresses","travel","inspiration","ai-chats","profile","notifications","contact"];
  const tabFromUrl = searchParams.get("tab");
  const activeTab = tabFromUrl && ALLOWED_TABS.includes(tabFromUrl) ? tabFromUrl : "assistant";
  const handleTabChange = (v: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", v);
    // Explicitly preserve the current pathname (which includes /en or /ar prefix)
    // so the language segment is never dropped when switching tabs.
    navigate({ pathname: location.pathname, search: `?${next.toString()}` }, { replace: true });
  };

  const quickTabs = [
    { tab: "assistant", icon: Bot, label: language === "en" ? "AI Assistant" : language === "ar" ? "مساعد الذكاء" : "Assistant IA" },
    { tab: "addresses", icon: MapPin, label: language === "en" ? "My places" : language === "ar" ? "عناويني" : "Mes adresses" },
    { tab: "travel", icon: Plane, label: language === "en" ? "Travel" : language === "ar" ? "سفر" : "Voyage" },
    { tab: "ai-chats", icon: MessageCircle, label: language === "en" ? "AI chats" : language === "ar" ? "محادثات الذكاء" : "IA CHAT" },
  ];
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<{ id: string; business_id: string; name: string; city: string | null; main_category: string | null; slug: string | null; promotions: { id: string; title: string | null; type: string; value: number; currency: string; message: string | null; images: string[] }[] }[]>([]);
  const [countries, setCountries] = useState<{ id: string; name_fr: string; name_en: string | null; name_ar: string | null; code: string | null }[]>([]);
  const [personas, setPersonas] = useState<{ id: string; slug: string; name_fr: string; name_en: string | null; name_ar: string | null }[]>([]);
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<Set<string>>(new Set());
  const [initialPersonaIds, setInitialPersonaIds] = useState<Set<string>>(new Set());
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => setPanelOpen(!!(e as CustomEvent).detail?.open);
    window.addEventListener("club:panel", handler);
    return () => window.removeEventListener("club:panel", handler);
  }, []);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    nickname: "",
    city: "",
    country: "",
    email: "",
    phone: "",
    whatsapp: "",
    website: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    youtube: "",
    twitter: "",
    linkedin: "",
    pinterest: "",
    spotify: "",
    soundcloud: "",
    description: "",
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
            website: (memberRes.data as any).website || "",
            instagram: (memberRes.data as any).instagram || "",
            facebook: (memberRes.data as any).facebook || "",
            tiktok: (memberRes.data as any).tiktok || "",
            youtube: (memberRes.data as any).youtube || "",
            twitter: (memberRes.data as any).twitter || "",
            linkedin: (memberRes.data as any).linkedin || "",
            pinterest: (memberRes.data as any).pinterest || "",
            spotify: (memberRes.data as any).spotify || "",
            soundcloud: (memberRes.data as any).soundcloud || "",
            description: (memberRes.data as any).description || "",
          });
          const path = (memberRes.data as any).avatar_url || null;
          setAvatarPath(path);
          if (path) {
            const { data: signed } = await supabase.storage.from("club-avatars").createSignedUrl(path, 3600);
            if (signed?.signedUrl) setAvatarUrl(signed.signedUrl);
          }
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
            supabase.from("affiliate_business_promotions").select("id, business_id, title, title_fr, title_en, title_ar, promotion_type, promotion_value, promotion_currency, promotion_message, promotion_message_fr, promotion_message_en, promotion_message_ar, images, sort_order").in("business_id", bIds).order("sort_order", { ascending: true }),
          ]);
          
          const bizMap = new Map((bizRes.data || []).map(b => [b.id, b]));
          const promosByBiz = new Map<string, any[]>();
          (promoRes.data || []).forEach((p: any) => {
            const list = promosByBiz.get(p.business_id) || [];
            list.push(p);
            promosByBiz.set(p.business_id, list);
          });
          setBookmarks(
            (bookmarksRes.data as any[]).map((bk: any) => {
              const biz = bizMap.get(bk.business_id);
              const promos = promosByBiz.get(bk.business_id) || [];
              return {
                id: bk.id,
                business_id: bk.business_id,
                name: biz?.name || "—",
                city: biz?.city || null,
                main_category: biz?.main_category || null,
                slug: biz?.slug || null,
                promotions: promos.map((p: any) => {
                  const langKey = (language || "fr").toLowerCase();
                  const localizedTitle = p[`title_${langKey}`] || p.title_fr || p.title || null;
                  const localizedMessage = p[`promotion_message_${langKey}`] || p.promotion_message_fr || p.promotion_message || null;
                  return {
                    id: p.id,
                    title: localizedTitle,
                    type: p.promotion_type,
                    value: Number(p.promotion_value) || 0,
                    currency: p.promotion_currency,
                    message: localizedMessage,
                    images: Array.isArray(p.images) ? p.images : [],
                  };
                }),
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadingAvatar(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("club-avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      // Remove old file
      if (avatarPath && avatarPath !== path) {
        await supabase.storage.from("club-avatars").remove([avatarPath]);
      }
      // Persist path
      if (memberId) {
        await supabase.from("club_members").update({ avatar_url: path } as any).eq("id", memberId);
      } else {
        const { data, error } = await supabase
          .from("club_members")
          .insert({ user_id: user.id, nickname: form.nickname || user.email || "Membre", avatar_url: path } as any)
          .select("id")
          .single();
        if (error) throw error;
        if (data) setMemberId(data.id);
      }
      setAvatarPath(path);
      const { data: signed } = await supabase.storage.from("club-avatars").createSignedUrl(path, 3600);
      if (signed?.signedUrl) setAvatarUrl(signed.signedUrl);
      toast({ title: language === "en" ? "Photo updated" : language === "ar" ? "تم تحديث الصورة" : "Photo mise à jour" });
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast({ title: language === "en" ? "Upload failed" : language === "ar" ? "فشل الرفع" : "Échec du téléversement", variant: "destructive" });

    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!form.nickname.trim()) return;
    if (plainTextLength(form.description) > MAX_DESCRIPTION_LENGTH) {
      toast({ title: language === "en" ? `Description: ${MAX_DESCRIPTION_LENGTH} characters max` : language === "ar" ? `الوصف: ${MAX_DESCRIPTION_LENGTH} حرف كحد أقصى` : `Description : ${MAX_DESCRIPTION_LENGTH} caractères max`, variant: "destructive" });
      return;
    }

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
        website: form.website.trim() || null,
        instagram: form.instagram.trim() || null,
        facebook: form.facebook.trim() || null,
        tiktok: form.tiktok.trim() || null,
        youtube: form.youtube.trim() || null,
        twitter: form.twitter.trim() || null,
        linkedin: form.linkedin.trim() || null,
        pinterest: form.pinterest.trim() || null,
        spotify: form.spotify.trim() || null,
        soundcloud: form.soundcloud.trim() || null,
        description: form.description?.trim() || null,
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
          // Email de bienvenue Club (garde anti-doublon côté serveur)
          supabase.functions
            .invoke("send-club-welcome", { body: { member_id: data.id } })
            .catch((e) => console.error("send-club-welcome failed", e));
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-2xl font-bold">{t.title}</h2>
        <div className="flex flex-row md:flex-col gap-2 items-center md:items-end w-full md:w-auto justify-start md:justify-end">
          <Button variant="outline" size="sm" onClick={onLogout} className="gap-2 border-white/30 text-white bg-transparent hover:bg-white/10 hover:text-white shrink-0">
            <LogOut className="h-4 w-4" />
            {t.logout}
          </Button>
          <ShareButton 
            shareUrl={form.nickname ? `https://oneworldmorocco.com/u/${form.nickname}` : `https://oneworldmorocco.com/u/`}
            title={language === "en" ? "My One World Morocco profile" : language === "ar" ? "ملفي على One World Morocco" : "Mon profil One World Morocco"}
            previewImage={hamsaBlueAsset.url}

            avatarImage={avatarUrl}
            variant="dark"
          />
        </div>
      </div>



      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full" orientation="vertical">
        <div className="flex flex-col gap-6">
          <div className={`flex flex-col items-center justify-center px-1 gap-3 transition-[width,max-width,margin] duration-300 ease-out ${panelOpen ? "lg:w-1/2 lg:max-w-[calc(50vw-1rem)] lg:mr-auto lg:ml-0" : "w-full"}`}>
            <div className="grid w-full grid-cols-3 justify-items-center gap-x-2 gap-y-2 md:flex md:w-auto md:flex-wrap md:items-center md:justify-center md:gap-4" dir="ltr">
              {quickTabs.map(({ tab, icon: Icon, label }) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleTabChange(tab)}
                  className="flex w-20 flex-col items-center gap-1 group md:w-auto md:gap-1.5"
                >
                  <span
                    className={`h-16 w-16 rounded-full flex items-center justify-center border border-white/30 transition hover:scale-[1.03] active:scale-95 md:h-24 md:w-24 ${activeTab === tab ? "bg-gold text-black ring-2 ring-white shadow-[inset_0_2px_8px_rgba(0,0,0,0.15)]" : "bg-white/10 text-white hover:bg-white/20"}`}
                  >
                    <Icon className="h-7 w-7 md:h-10 md:w-10" />
                  </span>
                  <span className="text-[10px] font-semibold text-white text-center leading-tight md:text-xs">{label}</span>
                </button>
              ))}
              <div className="flex w-20 flex-col items-center gap-1 md:w-auto md:gap-1.5">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  aria-label={language === "en" ? "Change profile photo" : language === "ar" ? "تغيير الصورة الشخصية" : "Changer la photo de profil"}
                  className="relative h-16 w-16 rounded-full overflow-hidden border border-border bg-muted hover:opacity-90 transition disabled:opacity-50 md:h-24 md:w-24"
                >
                  <img
                    src={avatarUrl || accountAvatar}
                    alt={language === "en" ? "Profile photo" : language === "ar" ? "الصورة الشخصية" : "Photo de profil"}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  {uploadingAvatar && (
                    <span className="absolute inset-0 flex items-center justify-center bg-background/60">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </span>
                  )}
                </button>
                {form.nickname && (
                  <div className="max-w-full truncate text-center text-[10px] font-semibold text-white md:text-sm">@{form.nickname}</div>
                )}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              {form.nickname && (
                <a
                  href={`https://oneworldmorocco.com${withLangPrefix(`/u/${encodeURIComponent(form.nickname)}`, language as "fr" | "en" | "ar")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-20 flex-col items-center gap-1 group md:w-auto md:gap-1.5"
                  aria-label="Digital ID"
                >
                  <span className="relative h-16 w-16 rounded-full overflow-hidden border border-white/30 bg-white/10 hover:scale-[1.03] active:scale-95 transition shadow-[inset_0_2px_8px_rgba(0,0,0,0.15)] md:h-24 md:w-24">
                    <img
                      src={digitalIdCardAsset.url}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover pointer-events-none"
                    />

                    <span className="absolute inset-0 rounded-full ring-1 ring-white/40 pointer-events-none" />
                  </span>
                  <span className="text-[10px] font-semibold text-white text-center leading-tight md:text-xs">Digital ID</span>
                </a>
              )}
            </div>
          </div>



          <div className="min-w-0">


        <TabsContent value="account" className="mt-6">
      {/* Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-white/90 mb-1 block">{t.firstName}</label>
            <Input value={form.first_name} onChange={handleChange("first_name")} className="bg-[#ECD6B8] text-black placeholder:text-black/60" />
          </div>
          <div>
            <label className="text-sm text-white/90 mb-1 block">{t.lastName}</label>
            <Input value={form.last_name} onChange={handleChange("last_name")} className="bg-[#ECD6B8] text-black placeholder:text-black/60" />
          </div>
        </div>

        <div>
          <label className="text-sm text-white font-semibold mb-1 block">
            {t.nickname} <span className="text-red-200">*</span>
          </label>
          <Input value={form.nickname} onChange={handleChange("nickname")} required className="bg-[#ECD6B8] text-black placeholder:text-black/60" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-white/90 mb-1 block">{t.cityLabel}</label>
            <Input value={form.city} onChange={handleChange("city")} className="bg-[#ECD6B8] text-black placeholder:text-black/60" />
          </div>
          <div>
            <label className="text-sm text-white/90 mb-1 block">{t.countryLabel}</label>
            <Select
              value={form.country}
              onValueChange={(val) => setForm(prev => ({ ...prev, country: val === "__none__" ? "" : val }))}
            >
              <SelectTrigger className="bg-[#ECD6B8] text-black border-none">
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
          <label className="text-sm text-white/90 mb-1 block">{t.emailLabel} *</label>
          <Input type="email" required value={form.email} onChange={handleChange("email")} className="bg-[#ECD6B8] text-black placeholder:text-black/60" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-white/90 mb-1 block">{t.phoneLabel}</label>
            <Input type="tel" value={form.phone} onChange={handleChange("phone")} className="bg-[#ECD6B8] text-black placeholder:text-black/60" />
          </div>
          <div>
            <label className="text-sm text-white/90 mb-1 block">{t.whatsappLabel}</label>
            <Input type="tel" value={form.whatsapp} onChange={handleChange("whatsapp")} className="bg-[#ECD6B8] text-black placeholder:text-black/60" />
          </div>
        </div>

        <p className="text-xs text-white/80 pt-2">{t.required}</p>






        {/* Description */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-white font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold" />
              {language === "en" ? "Description" : language === "ar" ? "الوصف" : "Description"}
            </label>
            <span className={`text-xs ${plainTextLength(form.description) > MAX_DESCRIPTION_LENGTH ? "text-red-300 font-semibold" : "text-white/70"}`}>
              {plainTextLength(form.description)} / {MAX_DESCRIPTION_LENGTH}
            </span>
          </div>
          <div className="[&_.ProseMirror]:text-black [&_.ProseMirror]:min-h-[220px] md:[&_.ProseMirror]:min-h-[120px] [&_.ProseMirror_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child]:before:text-black/60 [&_.ProseMirror_p.is-editor-empty:first-child]:before:float-left [&_.ProseMirror_p.is-editor-empty:first-child]:before:pointer-events-none">
            <RichTextEditor
              content={form.description}
              onChange={(html) => setForm(prev => ({ ...prev, description: html }))}
              placeholder={language === "en" ? "A few words about you (200 characters max)…" : language === "ar" ? "بعض الكلمات عنك (200 حرف كحد أقصى)…" : "Quelques mots sur vous (200 caractères max)…"}
              maxHeight="320px"
              bgClass="bg-[#ECD6B8] text-black border-none"
            />
          </div>

        </div>

        {/* External links */}
        <div className="pt-2">
          <label className="text-sm text-white font-semibold mb-2 flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-gold" />
            {language === "en" ? "External links" : language === "ar" ? "روابط خارجية" : "Liens externes"}
          </label>
          <p className="text-xs text-white/70 mb-3">
            {language === "en"
              ? "Add your website and social networks (optional)."
              : language === "ar"
              ? "أضف موقعك الإلكتروني وشبكاتك الاجتماعية (اختياري)."
              : "Ajoutez votre site web et vos réseaux sociaux (facultatif)."}
          </p>
          <div className="space-y-3">
            {([
              { key: "website", label: language === "en" ? "Website" : language === "ar" ? "موقع الويب" : "Site web", placeholder: "https://…" },
              { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/…" },
              { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/…" },
              { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@…" },
              { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@…" },
              { key: "twitter", label: "X / Twitter", placeholder: "https://x.com/…" },
              { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/…" },
              { key: "pinterest", label: "Pinterest", placeholder: "https://pinterest.com/…" },
              { key: "spotify", label: "Spotify", placeholder: "https://open.spotify.com/…" },
              { key: "soundcloud", label: "SoundCloud", placeholder: "https://soundcloud.com/…" },
            ] as const).map(({ key, label, placeholder }) => (
              <div key={key} className="flex items-center gap-3">
                <div className="w-28 shrink-0 flex items-center gap-2">
                  {key !== "website" && SOCIAL_ICONS[key as string]}
                  <Label className="text-sm text-white/90">{label}</Label>
                </div>
                <Input
                  value={form[key]}
                  onChange={handleChange(key)}
                  placeholder={placeholder}
                  className="flex-1 text-sm bg-[#ECD6B8] text-black placeholder:text-black/60 border-none"
                />
                {form[key] && (
                  <a
                    href={form[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`${language === "en" ? "Open" : language === "ar" ? "فتح" : "Ouvrir"} ${label}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        


        <Button
          onClick={handleSave}
          disabled={isSaving || !form.nickname.trim() || !form.email.trim()}
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
          <p className="text-sm text-white/90">
            {language === "en" ? "No saved places yet. Browse the directory and click the bookmark icon to save your favorites!" : language === "ar" ? "لا توجد أماكن محفوظة بعد." : "Aucune adresse sauvegardée. Parcourez l'annuaire et cliquez sur l'icône marque-page pour sauvegarder vos favoris !"}
          </p>
        ) : (
          <div className="space-y-2">
            {bookmarks.map((bk) => (
              <div key={bk.id} className="rounded-lg bg-[#ECD6B8] text-black border-none overflow-hidden shadow-sm">
                <div className="flex items-center justify-between p-3">
                  <Link to={businessUrl({ id: bk.business_id, slug: bk.slug })} className="flex-1 min-w-0 hover:underline text-black">
                    <p className="font-semibold text-sm truncate">{bk.name}</p>
                    <p className="text-xs text-black/70">{[bk.city, bk.main_category].filter(Boolean).join(" · ")}</p>
                  </Link>
                  <div className="flex items-center gap-1 ml-2">
                    <Link to={businessUrl({ id: bk.business_id, slug: bk.slug })}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-black hover:bg-black/10 hover:text-black">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <BookmarkTripLinker userId={user.id} businessId={bk.business_id} />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-700 hover:text-red-800 hover:bg-black/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white text-black border-none">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-black">
                            {language === "en" ? "Remove saved place?" : language === "ar" ? "إزالة المكان المحفوظ؟" : "Retirer l'adresse sauvegardée ?"}
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-black/70">
                            {language === "en"
                              ? `Are you sure you want to remove "${bk.name}" from your saved places?`
                              : language === "ar"
                              ? `هل أنت متأكد من إزالة "${bk.name}" من أماكنك المحفوظة؟`
                              : `Êtes-vous sûr de vouloir retirer « ${bk.name} » de vos adresses sauvegardées ?`}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-black/5 hover:bg-black/10 text-black border-none">
                            {language === "en" ? "Cancel" : language === "ar" ? "إلغاء" : "Annuler"}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 text-white hover:bg-red-700"
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
                {bk.promotions.length > 0 && (
                  <div className="px-3 pb-3 pt-0 space-y-2">
                    {bk.promotions.map((promo) => (
                      <div key={promo.id} className="bg-white/50 rounded-md p-2.5 border border-dashed border-black/20">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Tag className="h-3.5 w-3.5 text-[#C04F17]" />
                          {promo.type && (
                            <span className="text-xs font-bold text-[#C04F17]">
                              {promo.type === "percentage"
                                ? `-${promo.value}%`
                                : `-${promo.value} ${promo.currency}`}
                            </span>
                          )}
                          {promo.title && (
                            <span className="text-xs font-semibold text-black truncate">{promo.type ? "— " : ""}{promo.title}</span>
                          )}
                        </div>
                        {promo.message && (
                          <div
                            className="text-xs text-black/80 prose prose-xs max-w-none [&_p]:m-0 [&_ul]:m-0 [&_li]:m-0"
                            dangerouslySetInnerHTML={{ __html: promo.message }}
                          />
                        )}
                        {promo.images.length > 0 && (
                          <div className="mt-2 flex gap-1 overflow-x-auto">
                            {promo.images.map((url) => (
                              <img key={url} src={url} alt="" className="h-14 w-14 rounded object-cover flex-shrink-0" />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
        </TabsContent>

        <TabsContent value="travel" className="mt-6">
          <ClubTrips userId={user.id} />
        </TabsContent>

        <TabsContent value="inspiration" className="mt-6">
          <div className="rounded-lg border border-dashed border-white/30 bg-white/10 p-10 text-center text-sm text-white/90">
            {language === "en" ? "Personalized inspiration coming soon." : language === "ar" ? "إلهام شخصي قريباً." : "Inspiration personnalisée bientôt disponible."}
          </div>
        </TabsContent>

        <TabsContent value="ai-chats" className="mt-6">
          <AiChatsList userId={user.id} />
        </TabsContent>



        <TabsContent value="profile" className="mt-6">
          <div className="pt-2">
            <label className="text-sm text-white font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold" />
              {language === "en" ? "Your traveler profile" : language === "ar" ? "ملفك الشخصي للسفر" : "Votre profil de voyageur"}
            </label>
            <p className="text-xs text-white/70 mb-3">
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
                        : "bg-[#ECD6B8] text-black border-none hover:bg-[#ECD6B8]/80"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="mt-6 w-full bg-[#25D366] text-white hover:bg-[#20bd5a] font-semibold py-6 text-base"
            >
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
              {t.save}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="assistant" className="mt-6">
          <ClubAiAssistant userId={user.id} />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <div className="rounded-lg border border-dashed border-white/30 bg-white/10 p-10 text-center text-sm text-white/90">
            {language === "en" ? "No notifications yet." : language === "ar" ? "لا توجد إشعارات بعد." : "Aucune notification pour le moment."}
          </div>
        </TabsContent>

        <TabsContent value="contact" className="mt-6">
          <div className="rounded-lg bg-[#ECD6B8] text-black p-6 text-sm space-y-3 shadow-sm border-none">
            <h3 className="text-lg font-bold flex items-center gap-2 text-black">
              <Mail className="h-5 w-5 text-[#C04F17]" />
              {language === "en" ? "Contact us" : language === "ar" ? "اتصل بنا" : "Contactez-nous"}
            </h3>
            <p className="text-black/80">
              {language === "en"
                ? "A question, a suggestion? Our team is here to help."
                : language === "ar"
                ? "سؤال أو اقتراح؟ فريقنا في خدمتك."
                : "Une question, une suggestion ? Notre équipe est à votre écoute."}
            </p>
            <a
              href="mailto:info@oneworldmorocco.com"
              className="inline-flex items-center gap-2 text-[#C04F17] hover:underline font-semibold"
            >
              <Mail className="h-4 w-4" />
              info@oneworldmorocco.com
            </a>
          </div>
        </TabsContent>
          </div>
        </div>
      </Tabs>

    </div>
  );
};

export default ClubDashboard;
