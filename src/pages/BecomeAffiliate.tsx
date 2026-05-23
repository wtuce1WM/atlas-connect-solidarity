import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { Check, ArrowRight, Zap, Shield, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/useSEO";

const BecomeAffiliate = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [formLoading, setFormLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  useSEO({
    title: "Devenir affilié",
    description: "Rejoignez le réseau ONE WORLD MOROCCO en tant qu'affilié et augmentez votre visibilité auprès des voyageurs.",
    canonical: "/become-affiliate",
  });

  const translations = {
    fr: {
      title: "Devenir affilié",
      subtitle: "Rejoignez la première place de marché solidaire du Maroc",
      description: "Développez votre visibilité et rejoignez un réseau de partenaires engagés.",
      pricingTitle: "Titre 2",
      pricingSubtitle: "Pas de frais cachés. Tout ce dont vous avez besoin pour développer votre visibilité.",
      offerBadge: "Offre de lancement",
      price: "Gratuit",
      priceSuffix: "pendant 3 mois",
      features: [
        "Fiche établissement complète",
        "Référencement sur toutes les pages",
        "Visibilité sur la carte interactive",
        "Badges et labels personnalisés",
        "Statistiques de consultation",
        "Redirection WhatsApp",
        "Accès au réseau de partenaires",
      ],
      cta: "Démarrer maintenant",
      personalSupport: "Accompagnement personnalisé inclus",
      formTitle: "Lancez votre visibilité maintenant.",
      formBadge1: "Mise en ligne rapide",
      formBadge2: "Sans engagement",
      formBadge3: "Support",
      labelName: "Nom de l'établissement *",
      labelFirstName: "Prénom *",
      labelLastName: "Nom *",
      labelPhone: "Téléphone *",
      labelEmail: "Email",
      labelCity: "Ville *",
      labelProjectName: "Nom de votre projet",
      labelWebsite: "Site Web",
      labelPaymentMethod: "Méthode de paiement",
      paymentOnline: "En ligne",
      paymentCheck: "Chèque",
      paymentTransfer: "Virement",
      paymentCash: "Espèces",
      labelMultipleListings: "Avez-vous besoin d'une seule fiche ou de publier plusieurs offres ?",
      optionSingle: "Une seule",
      optionMultiple: "Plusieurs",
      labelContentReady: "Votre texte et photos sont prêts pour commencer ?",
      optionYes: "Oui",
      optionNo: "Non",
      requiredNote: "* obligatoire",
      labelPaymentPlan: "Plan de paiement",
      paymentPlanFull: "Paiement complet",
      paymentPlanSplit: "Paiement en 2 fois",
      labelMessage: "Un message ? (optionnel)",
      submitBtn: "Envoyer ma demande",
      successMsg: "Merci ! Nous vous recontacterons rapidement.",
    },
    en: {
      title: "Become an affiliate",
      subtitle: "Join Morocco's first solidarity marketplace",
      description: "Grow your visibility and join a network of committed partners.",
      pricingTitle: "Titre 2",
      pricingSubtitle: "No hidden fees. Everything you need to grow your visibility.",
      offerBadge: "Launch offer",
      price: "Free",
      priceSuffix: "for 3 months",
      features: [
        "Complete business listing",
        "Referencing on all pages",
        "Visibility on the interactive map",
        "Custom badges and labels",
        "Consultation statistics",
        "WhatsApp redirection",
        "Access to the partner network",
      ],
      cta: "Start now",
      personalSupport: "Personalized support included",
      formTitle: "Launch your visibility now.",
      formBadge1: "Quick setup",
      formBadge2: "No commitment",
      formBadge3: "Support",
      labelName: "Business name *",
      labelFirstName: "First name *",
      labelLastName: "Last name *",
      labelPhone: "Phone *",
      labelEmail: "Email",
      labelCity: "City *",
      labelProjectName: "Project name",
      labelWebsite: "Website",
      labelPaymentMethod: "Payment method",
      paymentOnline: "Online",
      paymentCheck: "Check",
      paymentTransfer: "Bank transfer",
      paymentCash: "Cash",
      labelMultipleListings: "Do you need a single listing or do you want to publish multiple offers?",
      optionSingle: "Single",
      optionMultiple: "Multiple",
      labelContentReady: "Are your text and photos ready to start?",
      optionYes: "Yes",
      optionNo: "No",
      requiredNote: "* required",
      labelPaymentPlan: "Payment plan",
      paymentPlanFull: "Full payment",
      paymentPlanSplit: "Payment in 2 installments",
      labelMessage: "Any message? (optional)",
      submitBtn: "Send my request",
      successMsg: "Thank you! We'll get back to you shortly.",
    },
    ar: {
      title: "كن شريكًا",
      subtitle: "انضم إلى أول سوق تضامني في المغرب",
      description: "طور رؤيتك وانضم إلى شبكة شركاء ملتزمين.",
      pricingTitle: "Titre 2",
      pricingSubtitle: "لا رسوم خفية. كل ما تحتاجه لتطوير رؤيتك.",
      offerBadge: "عرض الانطلاق",
      price: "مجاني",
      priceSuffix: "لمدة 3 أشهر",
      features: [
        "بطاقة مؤسسة كاملة",
        "إحالة على جميع الصفحات",
        "ظهور على الخريطة التفاعلية",
        "شارات وتسميات مخصصة",
        "إحصائيات الاستشارة",
        "إعادة توجيه واتساب",
        "الوصول إلى شبكة الشركاء",
      ],
      cta: "ابدأ الآن",
      personalSupport: "مرافقة شخصية مشمولة",
      formTitle: "أطلق رؤيتك الآن.",
      formBadge1: "إعداد سريع",
      formBadge2: "بدون التزام",
      formBadge3: "دعم",
      labelName: "اسم المؤسسة *",
      labelFirstName: "الاسم الأول *",
      labelLastName: "اللقب *",
      labelPhone: "الهاتف *",
      labelEmail: "البريد الإلكتروني",
      labelCity: "المدينة *",
      labelProjectName: "اسم مشروعك",
      labelWebsite: "الموقع الإلكتروني",
      labelPaymentMethod: "طريقة الدفع",
      paymentOnline: "عبر الإنترنت",
      paymentCheck: "شيك",
      paymentTransfer: "تحويل بنكي",
      paymentCash: "نقداً",
      labelMultipleListings: "هل تحتاج إلى بطاقة واحدة أم تريد نشر عروض متعددة؟",
      optionSingle: "واحدة",
      optionMultiple: "عدة",
      labelContentReady: "هل النصوص والصور جاهزة للبدء؟",
      optionYes: "نعم",
      optionNo: "لا",
      requiredNote: "* مطلوب",
      labelPaymentPlan: "خطة الدفع",
      paymentPlanFull: "دفع كامل",
      paymentPlanSplit: "دفع على مرتين",
      labelMessage: "رسالة؟ (اختياري)",
      submitBtn: "إرسال طلبي",
      successMsg: "شكراً! سنتواصل معك قريباً.",
    },
  };

  const t = translations[language as keyof typeof translations] || translations.fr;

  const [form, setForm] = useState({
    businessName: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    city: "",
    projectName: "",
    website: "",
    paymentMethod: "",
    multipleListings: "",
    contentReady: "",
    paymentPlan: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim() || !form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || !form.city.trim() || !form.email.trim()) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez remplir les champs obligatoires." });
      return;
    }
    setFormLoading(true);
    try {
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'affiliate-request',
          recipientEmail: 'jf@oneworldmorocco.com',
          idempotencyKey: `affiliate-req-${Date.now()}`,
          templateData: {
            businessName: form.businessName,
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone,
            email: form.email,
            city: form.city,
            website: form.website,
            multipleListings: form.multipleListings,
            contentReady: form.contentReady,
            message: form.message,
          },
        },
      });
      setFormSubmitted(true);
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue." });
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <HomeMindtripHeader />
      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="container mx-auto px-4 text-center mb-20">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6" style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {t.title}
            </h1>
            <p className="text-xl md:text-2xl text-gold mb-4">
              {t.subtitle}
            </p>
            <p className="text-lg text-muted-foreground">
              {t.description}
            </p>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="container mx-auto px-4 mb-24">
          <div className="text-center mb-12">
             <p className="text-lg text-muted-foreground max-w-xl mx-auto">
               {t.pricingSubtitle}
             </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="relative rounded-2xl border border-gold/30 bg-gradient-to-b from-black/[0.02] to-black/[0.04] p-8 md:p-10 shadow-[0_0_60px_-15px_hsl(43_75%_55%/0.2)]">
              {/* Badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="inline-block bg-gold text-black text-sm font-bold px-5 py-1.5 rounded-full shadow-lg">
                  {t.offerBadge}
                </span>
              </div>

              {/* Price */}
              <div className="text-center mt-4 mb-8">
                <span className="text-5xl md:text-6xl font-extrabold text-foreground">{t.price}</span>
                <p className="text-muted-foreground mt-2">{t.priceSuffix}</p>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent mb-8" />

              {/* Features */}
              <ul className="space-y-4 mb-10">
                {t.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-3 text-foreground/85">
                    <Check className="h-5 w-5 text-gold mt-0.5 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                className="w-full h-12 text-base font-bold bg-gold hover:bg-gold/90 text-black rounded-xl shadow-lg shadow-gold/20 transition-all hover:shadow-gold/40"
                onClick={() => {
                  document.getElementById("affiliate-form")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {t.cta}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <p className="text-center text-muted-foreground text-sm mt-4">{t.personalSupport}</p>
            </div>
          </div>
        </section>

        {/* Form Section */}
        <section id="affiliate-form" className="container mx-auto px-4 mb-16">
          {formSubmitted ? (
            <div className="max-w-lg mx-auto text-center py-20">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                {language === 'ar' ? 'شكراً لتواصلكم' : language === 'en' ? 'Thank you for reaching out' : 'Merci de votre prise de contact'}
              </h2>
              <p className="text-muted-foreground text-lg">
                {language === 'ar' ? 'سنتواصل معكم في أقرب وقت.' : language === 'en' ? 'We will contact you as soon as possible.' : 'Nous vous contacterons au plus vite.'}
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                  {t.formTitle}
                </h2>
                <div className="flex flex-wrap justify-center gap-4">
                  {[
                    { icon: Zap, label: t.formBadge1 },
                    { icon: Shield, label: t.formBadge2 },
                    { icon: Headphones, label: t.formBadge3 },
                  ].map(({ icon: Icon, label }) => (
                    <span key={label} className="inline-flex items-center gap-2 text-muted-foreground text-sm bg-black/[0.04] border border-black/10 rounded-full px-4 py-2">
                      <Icon className="h-4 w-4 text-gold" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-5">
                <p className="text-sm text-muted-foreground italic">{t.requiredNote}</p>
                <div>
                  <label className="block text-muted-foreground text-sm mb-1.5">{t.labelName}</label>
                  <Input
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    className="bg-black/[0.04] border-black/10 text-foreground placeholder:text-muted-foreground h-11"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-muted-foreground text-sm mb-1.5">{t.labelFirstName}</label>
                    <Input
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className="bg-black/[0.04] border-black/10 text-foreground placeholder:text-muted-foreground h-11"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-sm mb-1.5">{t.labelLastName}</label>
                    <Input
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      className="bg-black/[0.04] border-black/10 text-foreground placeholder:text-muted-foreground h-11"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-muted-foreground text-sm mb-1.5">{t.labelPhone}</label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="bg-black/[0.04] border-black/10 text-foreground placeholder:text-muted-foreground h-11"
                      type="tel"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-sm mb-1.5">{t.labelEmail} *</label>
                    <Input
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="bg-black/[0.04] border-black/10 text-foreground placeholder:text-muted-foreground h-11"
                      type="email"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-muted-foreground text-sm mb-1.5">{t.labelCity}</label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="bg-black/[0.04] border-black/10 text-foreground placeholder:text-muted-foreground h-11"
                  />
                </div>
                {/* <div>
                  <label className="block text-muted-foreground text-sm mb-1.5">{t.labelProjectName}</label>
                  <Input
                    value={form.projectName}
                    onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                    className="bg-black/[0.04] border-black/10 text-foreground placeholder:text-muted-foreground h-11"
                  />
                </div> */}
                <div>
                  <label className="block text-muted-foreground text-sm mb-1.5">{t.labelWebsite}</label>
                  <Input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    className="bg-black/[0.04] border-black/10 text-foreground placeholder:text-muted-foreground h-11"
                    type="url"
                  />
                </div>
                {/* <div>
                  <label className="block text-muted-foreground text-sm mb-1.5">{t.labelPaymentMethod}</label>
                  <Select value={form.paymentMethod} onValueChange={(val) => setForm({ ...form, paymentMethod: val })}>
                    <SelectTrigger className="bg-black/[0.04] border-black/10 text-foreground h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">{t.paymentOnline}</SelectItem>
                      <SelectItem value="check">{t.paymentCheck}</SelectItem>
                      <SelectItem value="transfer">{t.paymentTransfer}</SelectItem>
                      <SelectItem value="cash">{t.paymentCash}</SelectItem>
                    </SelectContent>
                  </Select>
                </div> */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-muted-foreground text-sm mb-1.5">{t.labelMultipleListings}</label>
                    <Select value={form.multipleListings} onValueChange={(val) => setForm({ ...form, multipleListings: val })}>
                      <SelectTrigger className="bg-black/[0.04] border-black/10 text-foreground h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">{t.optionSingle}</SelectItem>
                        <SelectItem value="multiple">{t.optionMultiple}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-sm mb-1.5">{t.labelContentReady}</label>
                    <Select value={form.contentReady} onValueChange={(val) => setForm({ ...form, contentReady: val })}>
                      <SelectTrigger className="bg-black/[0.04] border-black/10 text-foreground h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">{t.optionYes}</SelectItem>
                        <SelectItem value="no">{t.optionNo}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* <div>
                  <label className="block text-muted-foreground text-sm mb-1.5">{t.labelPaymentPlan}</label>
                  <Select value={form.paymentPlan} onValueChange={(val) => setForm({ ...form, paymentPlan: val })}>
                    <SelectTrigger className="bg-black/[0.04] border-black/10 text-foreground h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">{t.paymentPlanFull}</SelectItem>
                      <SelectItem value="split">{t.paymentPlanSplit}</SelectItem>
                    </SelectContent>
                  </Select>
                </div> */}
                <div>
                  <label className="block text-muted-foreground text-sm mb-1.5">{t.labelMessage}</label>
                  <Textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="bg-black/[0.04] border-black/10 text-foreground placeholder:text-muted-foreground min-h-[100px]"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="w-full h-12 text-base font-bold bg-gold hover:bg-gold/90 text-black rounded-xl shadow-lg shadow-gold/20 transition-all hover:shadow-gold/40"
                >
                  {formLoading ? "..." : t.submitBtn}
                  {!formLoading && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>
              </form>
            </>
          )}
        </section>
      </main>
      <Footer variant="verified" />
    </div>
  );
};

export default BecomeAffiliate;
