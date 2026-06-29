import { useState } from "react";
import { Phone, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  redirectPath?: string;
  onSuccess?: () => void;
}

const labels = {
  fr: {
    google: "Continuer avec Google",
    apple: "Continuer avec Apple",
    phone: "Utiliser le téléphone",
    phonePlaceholder: "+212 6 12 34 56 78",
    phoneHint: "Inclure l'indicatif pays (ex : +212)",
    sendCode: "Envoyer le code",
    codePlaceholder: "Code à 6 chiffres",
    verify: "Vérifier",
    back: "Retour",
    codeSent: "Code envoyé par SMS",
    error: "Une erreur est survenue",
  },
  en: {
    google: "Continue with Google",
    apple: "Continue with Apple",
    phone: "Use phone number",
    phonePlaceholder: "+1 555 123 4567",
    phoneHint: "Include country code (e.g. +1)",
    sendCode: "Send code",
    codePlaceholder: "6-digit code",
    verify: "Verify",
    back: "Back",
    codeSent: "Code sent by SMS",
    error: "An error occurred",
  },
  ar: {
    google: "المتابعة مع جوجل",
    apple: "المتابعة مع آبل",
    phone: "استخدام رقم الهاتف",
    phonePlaceholder: "+212 6 12 34 56 78",
    phoneHint: "أدخل رمز البلد (مثل +212)",
    sendCode: "إرسال الرمز",
    codePlaceholder: "الرمز المكوّن من 6 أرقام",
    verify: "تحقّق",
    back: "رجوع",
    codeSent: "تم إرسال الرمز عبر SMS",
    error: "حدث خطأ",
  },
} as const;

const TileButton = ({
  icon,
  children,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="relative w-full rounded-md border border-border bg-white hover:bg-neutral-50 transition-colors py-3.5 px-4 flex items-center justify-center text-xs sm:text-base font-semibold text-black disabled:opacity-50"
  >
    <span className="absolute left-4 flex items-center justify-center w-6 h-6">
      {icon}
    </span>
    <span className="text-center">{children}</span>
  </button>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-black" fill="currentColor">
    <path d="M16.365 1.43c0 1.14-.46 2.23-1.21 3.04-.79.85-2.07 1.51-3.13 1.43-.13-1.1.45-2.27 1.18-3.04.81-.86 2.18-1.5 3.16-1.43zM20.6 17.4c-.59 1.32-.87 1.91-1.62 3.07-1.05 1.62-2.53 3.64-4.36 3.65-1.63.02-2.05-1.06-4.27-1.05-2.22.01-2.68 1.07-4.31 1.05-1.83-.02-3.23-1.84-4.28-3.46C-1.16 16.97-1.5 11.4 1.05 8.41c1.43-1.69 3.69-2.69 5.81-2.69 2.16 0 3.52 1.18 5.31 1.18 1.74 0 2.8-1.18 5.3-1.18 1.89 0 3.89.99 5.32 2.71-4.68 2.56-3.92 9.25 1.05 11.27z" />
  </svg>
);

const ClubSocialButtons = ({ redirectPath = "/club", onSuccess }: Props) => {
  const { language } = useLanguage();
  const t = labels[language as keyof typeof labels] || labels.fr;

  const [phoneMode, setPhoneMode] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"input" | "code">("input");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleOAuth = async (provider: "google" | "apple") => {
    import("@/lib/analytics").then(({ trackEvent }) =>
      trackEvent("auth_method_chosen", { method: provider, surface: "club" })
    ).catch(() => {});
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin + redirectPath,
    });
    if (error) {
      console.error(`${provider} sign-in error:`, error);
      toast({ title: t.error, variant: "destructive" });
    }
  };

  const handleSendCode = async () => {
    if (!phone.trim()) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-phone-otp", {
      body: { phone: phone.trim() },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      toast({ title: (data as any)?.error || error?.message || t.error, variant: "destructive" });
      return;
    }
    toast({ title: t.codeSent });
    setStep("code");
  };

  const handleVerify = async () => {
    if (!code.trim()) return;
    setVerifying(true);
    const { data, error } = await supabase.functions.invoke("verify-phone-otp", {
      body: { phone: phone.trim(), code: code.trim() },
    });
    if (error || (data as any)?.error) {
      setVerifying(false);
      toast({ title: (data as any)?.error || error?.message || t.error, variant: "destructive" });
      return;
    }
    const { phone: normPhone, password } = data as { phone: string; password: string };
    const { error: signErr } = await supabase.auth.signInWithPassword({
      phone: normPhone,
      password,
    });
    setVerifying(false);
    if (signErr) {
      toast({ title: signErr.message || t.error, variant: "destructive" });
      return;
    }
    onSuccess?.();
  };

  if (phoneMode) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => {
            setPhoneMode(false);
            setStep("input");
            setCode("");
          }}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t.back}
        </button>

        {step === "input" ? (
          <div className="space-y-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.phonePlaceholder}
              className="w-full rounded-md border border-border bg-white px-4 py-3 text-base text-black placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">{t.phoneHint}</p>
            <button
              type="button"
              onClick={handleSendCode}
              disabled={sending || !phone.trim()}
              className="w-full rounded-md bg-primary text-primary-foreground py-3 font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.sendCode}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder={t.codePlaceholder}
              className="w-full rounded-md border border-border bg-white px-4 py-3 text-base text-black placeholder:text-muted-foreground tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying || code.length < 6}
              className="w-full rounded-md bg-primary text-primary-foreground py-3 font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {verifying && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.verify}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <TileButton icon={<Phone className="h-5 w-5" />} onClick={() => setPhoneMode(true)}>
        {t.phone}
      </TileButton>
      <TileButton icon={<GoogleIcon />} onClick={() => handleOAuth("google")}>
        {t.google}
      </TileButton>
      <TileButton icon={<AppleIcon />} onClick={() => handleOAuth("apple")}>
        {t.apple}
      </TileButton>
    </div>
  );
};

export default ClubSocialButtons;
