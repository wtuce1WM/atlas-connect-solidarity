import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Crown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Club = () => {
  const { language } = useLanguage();

  const t = {
    fr: {
      title: "Le Club OWM",
      subtitle: "Rejoignez le club et accédez à des avantages exclusifs",
      desc: "En tant que membre du Club One World Morocco, vous bénéficiez de réductions, d'offres spéciales et d'un accès privilégié aux meilleurs établissements du Maroc.",
      comingSoon: "Inscription bientôt disponible",
      benefits: "Avantages membres",
      benefit1: "Réductions exclusives chez nos partenaires",
      benefit2: "Accès prioritaire aux événements",
      benefit3: "Offres spéciales et surprises",
      benefit4: "Newsletter personnalisée",
    },
    en: {
      title: "The OWM Club",
      subtitle: "Join the club and access exclusive benefits",
      desc: "As a One World Morocco Club member, enjoy discounts, special offers, and privileged access to the best establishments in Morocco.",
      comingSoon: "Registration coming soon",
      benefits: "Member benefits",
      benefit1: "Exclusive discounts at our partners",
      benefit2: "Priority access to events",
      benefit3: "Special offers and surprises",
      benefit4: "Personalised newsletter",
    },
    ar: {
      title: "نادي OWM",
      subtitle: "انضم إلى النادي واحصل على مزايا حصرية",
      desc: "بصفتك عضواً في نادي One World Morocco، استمتع بتخفيضات وعروض خاصة ووصول مميز لأفضل المؤسسات في المغرب.",
      comingSoon: "التسجيل قريباً",
      benefits: "مزايا الأعضاء",
      benefit1: "تخفيضات حصرية لدى شركائنا",
      benefit2: "أولوية الوصول إلى الفعاليات",
      benefit3: "عروض خاصة ومفاجآت",
      benefit4: "نشرة إخبارية مخصصة",
    },
  }[language] || {
    title: "Le Club OWM",
    subtitle: "Rejoignez le club et accédez à des avantages exclusifs",
    desc: "En tant que membre du Club One World Morocco, vous bénéficiez de réductions, d'offres spéciales et d'un accès privilégié aux meilleurs établissements du Maroc.",
    comingSoon: "Inscription bientôt disponible",
    benefits: "Avantages membres",
    benefit1: "Réductions exclusives chez nos partenaires",
    benefit2: "Accès prioritaire aux événements",
    benefit3: "Offres spéciales et surprises",
    benefit4: "Newsletter personnalisée",
  };

  const benefits = [t.benefit1, t.benefit2, t.benefit3, t.benefit4];

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

          <div className="text-center">
            <div className="inline-block rounded-full bg-muted px-8 py-3 text-muted-foreground font-semibold text-sm">
              {t.comingSoon}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Club;
