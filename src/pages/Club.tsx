import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Crown, Loader2, CheckCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Club = () => {
  const { language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    nickname: "",
    city: "",
    country: "",
    email: "",
    phone: "",
    whatsapp: "",
    skype: "",
  });

  const t = {
    fr: {
      title: "Le Club OWM",
      subtitle: "Rejoignez le club et accédez à des avantages exclusifs",
      desc: "En tant que membre du Club One World Morocco, vous bénéficiez de réductions, d'offres spéciales et d'un accès privilégié aux meilleurs établissements du Maroc.",
      benefits: "Avantages membres",
      benefit1: "Réductions exclusives chez nos partenaires",
      benefit2: "Accès prioritaire aux événements",
      benefit3: "Offres spéciales et surprises",
      benefit4: "Newsletter personnalisée",
      register: "Inscription au Club",
      firstName: "Prénom",
      lastName: "Nom",
      nickname: "Pseudonyme",
      cityLabel: "Ville de résidence",
      countryLabel: "Pays de résidence",
      emailLabel: "Email",
      phoneLabel: "Téléphone",
      whatsappLabel: "WhatsApp",
      skypeLabel: "Skype",
      submit: "S'inscrire",
      required: "* obligatoire",
      successTitle: "Bienvenue au Club OWM !",
      successMsg: "Votre inscription a bien été enregistrée.",
      errorMsg: "Une erreur est survenue, veuillez réessayer.",
    },
    en: {
      title: "The OWM Club",
      subtitle: "Join the club and access exclusive benefits",
      desc: "As a One World Morocco Club member, enjoy discounts, special offers, and privileged access to the best establishments in Morocco.",
      benefits: "Member benefits",
      benefit1: "Exclusive discounts at our partners",
      benefit2: "Priority access to events",
      benefit3: "Special offers and surprises",
      benefit4: "Personalised newsletter",
      register: "Club Registration",
      firstName: "First name",
      lastName: "Last name",
      nickname: "Nickname",
      cityLabel: "City of residence",
      countryLabel: "Country of residence",
      emailLabel: "Email",
      phoneLabel: "Phone",
      whatsappLabel: "WhatsApp",
      skypeLabel: "Skype",
      submit: "Register",
      required: "* required",
      successTitle: "Welcome to the OWM Club!",
      successMsg: "Your registration has been recorded.",
      errorMsg: "An error occurred, please try again.",
    },
    ar: {
      title: "نادي OWM",
      subtitle: "انضم إلى النادي واحصل على مزايا حصرية",
      desc: "بصفتك عضواً في نادي One World Morocco، استمتع بتخفيضات وعروض خاصة ووصول مميز لأفضل المؤسسات في المغرب.",
      benefits: "مزايا الأعضاء",
      benefit1: "تخفيضات حصرية لدى شركائنا",
      benefit2: "أولوية الوصول إلى الفعاليات",
      benefit3: "عروض خاصة ومفاجآت",
      benefit4: "نشرة إخبارية مخصصة",
      register: "التسجيل في النادي",
      firstName: "الاسم الأول",
      lastName: "اللقب",
      nickname: "الاسم المستعار",
      cityLabel: "مدينة الإقامة",
      countryLabel: "بلد الإقامة",
      emailLabel: "البريد الإلكتروني",
      phoneLabel: "الهاتف",
      whatsappLabel: "واتساب",
      skypeLabel: "سكايب",
      submit: "تسجيل",
      required: "* مطلوب",
      successTitle: "مرحباً بك في نادي OWM!",
      successMsg: "تم تسجيلك بنجاح.",
      errorMsg: "حدث خطأ، يرجى المحاولة مرة أخرى.",
    },
  }[language] || {
    title: "Le Club OWM",
    subtitle: "Rejoignez le club et accédez à des avantages exclusifs",
    desc: "En tant que membre du Club One World Morocco, vous bénéficiez de réductions, d'offres spéciales et d'un accès privilégié aux meilleurs établissements du Maroc.",
    benefits: "Avantages membres",
    benefit1: "Réductions exclusives chez nos partenaires",
    benefit2: "Accès prioritaire aux événements",
    benefit3: "Offres spéciales et surprises",
    benefit4: "Newsletter personnalisée",
    register: "Inscription au Club",
    firstName: "Prénom",
    lastName: "Nom",
    nickname: "Pseudonyme",
    cityLabel: "Ville de résidence",
    countryLabel: "Pays de résidence",
    emailLabel: "Email",
    phoneLabel: "Téléphone",
    whatsappLabel: "WhatsApp",
    skypeLabel: "Skype",
    submit: "S'inscrire",
    required: "* obligatoire",
    successTitle: "Bienvenue au Club OWM !",
    successMsg: "Votre inscription a bien été enregistrée.",
    errorMsg: "Une erreur est survenue, veuillez réessayer.",
  };

  const benefits = [t.benefit1, t.benefit2, t.benefit3, t.benefit4];

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nickname.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: Record<string, string> = { nickname: form.nickname.trim() };
      if (form.first_name.trim()) payload.first_name = form.first_name.trim();
      if (form.last_name.trim()) payload.last_name = form.last_name.trim();
      if (form.city.trim()) payload.city = form.city.trim();
      if (form.country.trim()) payload.country = form.country.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.whatsapp.trim()) payload.whatsapp = form.whatsapp.trim();
      if (form.skype.trim()) payload.skype = form.skype.trim();

      const { error } = await supabase.from("club_members" as any).insert(payload as any);
      if (error) throw error;

      setIsRegistered(true);
      toast({ title: t.successTitle, description: t.successMsg });
    } catch (err) {
      console.error("Club registration error:", err);
      toast({ title: t.errorMsg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="bg-primary text-primary-foreground py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Crown className="h-12 w-12 mx-auto mb-4 opacity-90" />
            <h1 className="text-4xl font-bold mb-3">{t.title}</h1>
            <p className="text-lg opacity-90">{t.subtitle}</p>
          </div>
        </section>

        {/* Content */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <p className="text-muted-foreground text-center text-lg leading-relaxed mb-10">{t.desc}</p>

          <h2 className="text-2xl font-bold text-center mb-6 !font-sans !not-italic">{t.benefits}</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-12">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border shadow-sm">
                <Crown className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-card-foreground">{b}</span>
              </div>
            ))}
          </div>

          {/* Registration Form */}
          <div className="max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-center mb-2">{t.register}</h2>
            <p className="text-center text-xs text-muted-foreground mb-6">{t.required}</p>

            {isRegistered ? (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <p className="text-xl font-bold text-foreground mb-2">{t.successTitle}</p>
                <p className="text-muted-foreground">{t.successMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    {t.nickname} <span className="text-red-500">*</span>
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
                    <Input value={form.country} onChange={handleChange("country")} />
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

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{t.skypeLabel}</label>
                  <Input value={form.skype} onChange={handleChange("skype")} />
                </div>

                <p className="text-xs text-muted-foreground mb-2">{t.required}</p>
                <Button
                  type="submit"
                  disabled={isSubmitting || !form.nickname.trim()}
                  className="w-full bg-gold text-black hover:bg-gold/90 font-semibold py-6 text-base"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Crown className="h-5 w-5 mr-2" />}
                  {t.submit}
                </Button>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Club;
