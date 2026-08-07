// Settings panel for the Tides & Wind widget: city picker, subscriber identity
// (email, nickname, avatar) and per-alert opt-ins.
// Front-only for now: preferences are stored in `widget_alert_subscribers`.
// No email is sent yet — the alert engine (cron + evaluation) is a separate build.
import React from "react";
import { supabase } from "@/integrations/supabase/client";

type Lang = "fr" | "en" | "ar";
type CityOption = { slug: string; name: string; sea?: string };

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tides`;

const ALERT_KEYS = ["spring_tide", "surf", "kitesurf", "wingfoil", "fishing"] as const;
type AlertKey = (typeof ALERT_KEYS)[number];

const T: Record<Lang, Record<string, string>> = {
  fr: {
    title: "Paramètres",
    close: "Fermer",
    city: "Ville côtière",
    email: "Votre email",
    nickname: "Pseudonyme",
    avatar: "Votre image",
    pick: "Choisir une image",
    alerts: "Être averti des alertes météo",
    spring_tide: "Grande marée demain",
    surf: "Conditions idéales pour le surf",
    kitesurf: "Conditions idéales pour le kitesurf",
    wingfoil: "Conditions idéales pour le wingfoil",
    fishing: "Marée parfaite pour la pêche",
    save: "Enregistrer",
    saving: "Enregistrement…",
    saved: "Préférences enregistrées",
    errEmail: "Email invalide",
    errSave: "Enregistrement impossible",
    errUpload: "Image non envoyée",
    note: "Les alertes seront envoyées par email dès l'activation du service.",
  },
  en: {
    title: "Settings",
    close: "Close",
    city: "Coastal city",
    email: "Your email",
    nickname: "Nickname",
    avatar: "Your picture",
    pick: "Choose an image",
    alerts: "Notify me of weather alerts",
    spring_tide: "Spring tide tomorrow",
    surf: "Ideal surf conditions",
    kitesurf: "Ideal kitesurf conditions",
    wingfoil: "Ideal wingfoil conditions",
    fishing: "Perfect tide for fishing",
    save: "Save",
    saving: "Saving…",
    saved: "Preferences saved",
    errEmail: "Invalid email",
    errSave: "Could not save",
    errUpload: "Image upload failed",
    note: "Alerts will be emailed as soon as the service goes live.",
  },
  ar: {
    title: "الإعدادات",
    close: "إغلاق",
    city: "مدينة ساحلية",
    email: "بريدك الإلكتروني",
    nickname: "الاسم المستعار",
    avatar: "صورتك",
    pick: "اختر صورة",
    alerts: "تنبيهات الطقس",
    spring_tide: "مد قوي غدًا",
    surf: "ظروف مثالية للسيرف",
    kitesurf: "ظروف مثالية للكايت سيرف",
    wingfoil: "ظروف مثالية للوينغ فويل",
    fishing: "مد مثالي للصيد",
    save: "حفظ",
    saving: "جارٍ الحفظ…",
    saved: "تم الحفظ",
    errEmail: "بريد غير صالح",
    errSave: "تعذر الحفظ",
    errUpload: "تعذر رفع الصورة",
    note: "سيتم إرسال التنبيهات بالبريد عند تشغيل الخدمة.",
  },
};

const STORAGE_KEY = "owm-widget-alert-prefs";
const ALLOWED_AVATAR_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_AVATAR_BYTES = 400 * 1024;


export default function EmbedWidgetSettings({
  lang = "fr",
  citySlug,
  cityName,
  onCityChange,
  onClose,
}: {
  lang?: Lang;
  citySlug: string;
  cityName: string;
  onCityChange?: (slug: string) => void;
  onClose: () => void;
}) {
  const L = T[lang];
  const [cities, setCities] = React.useState<CityOption[]>([]);
  const [email, setEmail] = React.useState("");
  const [nickname, setNickname] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [alerts, setAlerts] = React.useState<Record<AlertKey, boolean>>({
    spring_tide: false,
    surf: false,
    kitesurf: false,
    wingfoil: false,
    fishing: false,
  });
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Restore any locally stored identity so the panel is pre-filled.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p.email) setEmail(p.email);
      if (p.nickname) setNickname(p.nickname);
      if (p.avatarUrl) setAvatarUrl(p.avatarUrl);
      if (p.alerts) setAlerts((a) => ({ ...a, ...p.alerts }));
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${FN_URL}?list=1`);
        const json = await res.json();
        if (alive && Array.isArray(json?.cities)) setCities(json.cities);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const currentSlug =
    cities.find((c) => c.slug === citySlug || c.name.toLowerCase() === cityName.toLowerCase())?.slug || citySlug;

  const handleUpload = async (file: File) => {
    setUploading(true);
    setErrorMsg(null);
    try {
      if (!ALLOWED_AVATAR_MIME.includes(file.type) || file.size > MAX_AVATAR_BYTES) {
        throw new Error("invalid");
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read"));
        reader.readAsDataURL(file);
      });
      setPendingAvatar({ mime: file.type, data: dataUrl.split(",")[1] || "" });
      setAvatarUrl(dataUrl);
    } catch {
      setErrorMsg(L.errUpload);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setErrorMsg(null);
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setErrorMsg(L.errEmail);
      setStatus("error");
      return;
    }
    setStatus("saving");
    const payload = {
      city_slug: currentSlug,
      city_name: cityName,
      email: trimmed,
      nickname: nickname.trim() || null,
      avatar_url: avatarUrl && /^https:\/\//i.test(avatarUrl) ? avatarUrl : null,
      avatar: pendingAvatar,
      lang,
      alert_spring_tide: alerts.spring_tide,
      alert_surf: alerts.surf,
      alert_kitesurf: alerts.kitesurf,
      alert_wingfoil: alerts.wingfoil,
      alert_fishing: alerts.fishing,
    };
    let savedAvatarUrl: string | null = payload.avatar_url;
    try {
      const { data, error } = await supabase.functions.invoke("widget-alerts-subscribe", {
        body: payload,
      });
      if (error) throw error;
      if (data?.avatar_url) {
        savedAvatarUrl = data.avatar_url as string;
        setAvatarUrl(savedAvatarUrl);
      }
      setPendingAvatar(null);
    } catch {
      setErrorMsg(L.errSave);
      setStatus("error");
      return;
    }
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ email: trimmed, nickname, avatarUrl: savedAvatarUrl, alerts }),
      );
    } catch {
      /* ignore */
    }
    setStatus("saved");
    setTimeout(() => onClose(), 1200);
  };


  return (
    <div
      className="px-4 py-4 text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900"
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-sm font-semibold">⚙️ {L.title}</div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-2.5 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
        >
          ✕ {L.close}
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[11px] uppercase tracking-wider opacity-60 mb-1" htmlFor="ws-city">
            {L.city}
          </label>
          <select
            id="ws-city"
            value={currentSlug}
            onChange={(e) => onCityChange?.(e.target.value)}
            disabled={!onCityChange || cities.length === 0}
            className="w-full rounded-2xl bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm disabled:opacity-60"
          >
            {cities.length === 0 && <option value={currentSlug}>{cityName}</option>}
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] uppercase tracking-wider opacity-60 mb-1" htmlFor="ws-email">
              {L.email}
            </label>
            <input
              id="ws-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              placeholder="vous@exemple.com"
              className="w-full rounded-2xl bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider opacity-60 mb-1" htmlFor="ws-nick">
              {L.nickname}
            </label>
            <input
              id="ws-nick"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={40}
              className="w-full rounded-2xl bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider opacity-60 mb-1">{L.avatar}</div>
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt={L.avatar} className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <div className="h-11 w-11 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-lg">
                🙂
              </div>
            )}
            <label className="cursor-pointer rounded-2xl bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-xs font-medium">
              {uploading ? "…" : L.pick}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
            </label>
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider opacity-60 mb-1.5">{L.alerts}</div>
          <div className="space-y-1.5">
            {ALERT_KEYS.map((k) => (
              <label
                key={k}
                className="flex items-center gap-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-xs cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={alerts[k]}
                  onChange={(e) => setAlerts((a) => ({ ...a, [k]: e.target.checked }))}
                  className="h-4 w-4 accent-primary"
                />
                <span>{L[k]}</span>
              </label>
            ))}
          </div>
        </div>

        {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
        {status === "saved" && <p className="text-xs text-emerald-600 dark:text-emerald-400">✓ {L.saved}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={status === "saving"}
          className="w-full rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {status === "saving" ? L.saving : L.save}
        </button>
        <p className="text-[10px] leading-snug text-neutral-500 dark:text-neutral-400">{L.note}</p>
      </div>
    </div>
  );
}
