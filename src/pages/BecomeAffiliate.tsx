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
      subtitle: "Prenez le contrôle de votre présence numérique à l'heure de l'IA",
      description: "",
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
      subtitle: "Take control of your digital presence in the age of AI",
      description: "",
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
      subtitle: "سيطر على حضورك الرقمي في عصر الذكاء الاصطناعي",
      description: "",
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
      // 1. Crée l'entrée affilié (statut inactif) dans Back-office / B2B / Liste des Affiliés
      const { error: affiliateError } = await supabase.functions.invoke('submit-affiliate-request', {
        body: {
          businessName: form.businessName,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          email: form.email,
          city: form.city,
          projectName: form.projectName,
          website: form.website,
          paymentMethod: form.paymentMethod,
          multipleListings: form.multipleListings,
          contentReady: form.contentReady,
          paymentPlan: form.paymentPlan,
          message: form.message,
        },
      });
      if (affiliateError) console.error('affiliate request failed', affiliateError);

      // 2. Notification email interne
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

      // 3. Accusé de réception au demandeur
      const stamp = Date.now();
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'affiliate-request-received',
          recipientEmail: form.email.trim(),
          idempotencyKey: `affiliate-req-ack-${form.email.trim().toLowerCase()}-${stamp}`,
          templateData: {
            businessName: form.businessName,
            firstName: form.firstName,
            city: form.city,
          },
        },
      });

      setFormSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue." });
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ECD6B8]">
      <HomeMindtripHeader />
      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="container mx-auto px-4 text-center mb-20">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-4">
              {t.title}
            </p>
            <h1 className="font-josefin text-[26px] sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[#C04F17]" style={{ lineHeight: 1.2 }}>
              {t.subtitle}
            </h1>
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

        {/* Adhésion professionnelle Section */}
        <section className="bg-[#3B3B3B] text-white py-20 mt-20" id="abonnements">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <span className="text-[#D4AF37] uppercase tracking-[0.24em] text-xs font-semibold block mb-4">
                {language === 'ar' ? 'العضوية المهنية' : language === 'en' ? 'Professional Membership' : 'Adhésion professionnelle'}
              </span>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                {language === 'ar' ? 'التزام واحد، أربعة مستويات.' : language === 'en' ? 'One commitment, four tiers.' : 'Un engagement, quatre paliers.'}
              </h2>
              <p className="text-white/80 text-base md:text-lg leading-relaxed">
                {language === 'ar' 
                  ? 'اشتراك شهري، بدون عمولة، و 20% تذهب للقضايا الإنسانية في المغرب — أياً كان مستواك.' 
                  : language === 'en' 
                    ? 'A monthly subscription, zero commission, and 20% donated to humanitarian causes in Morocco — whichever tier you choose.' 
                    : 'Un abonnement mensuel, zéro commission, et 20% reversés à des causes humanitaires au Maroc — quel que soit votre palier.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border border-[#D4AF37]/20 rounded-xl overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#D4AF37]/20">
              {/* Micro */}
              <div className="p-8 md:p-10 transition-all duration-300 hover:bg-[#D4AF37]/5 flex flex-col justify-between">
                <div>
                  <div className="text-[#D4AF37] text-xs tracking-[0.26em] uppercase font-bold mb-6">
                    {language === 'ar' ? 'مايكرو' : 'Micro'}
                  </div>
                  <div className="font-bold text-4xl md:text-5xl text-white leading-none mb-6" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    20€<small className="text-sm font-normal text-white/70 ml-1">/{language === 'ar' ? 'شهر' : language === 'en' ? 'month' : 'mois'}</small>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {language === 'ar'
                      ? 'للمستقلين والمشاريع الصغيرة التي تنضم إلى واجهتنا الأخلاقية.'
                      : language === 'en'
                        ? 'For freelancers and small businesses joining the ethical showcase.'
                        : "Pour l'indépendant et la petite structure qui rejoignent la vitrine éthique."}
                  </p>
                </div>
              </div>

              {/* Intermédiaire */}
              <div className="p-8 md:p-10 transition-all duration-300 hover:bg-[#D4AF37]/5 flex flex-col justify-between">
                <div>
                  <div className="text-[#D4AF37] text-xs tracking-[0.26em] uppercase font-bold mb-6">
                    {language === 'ar' ? 'متوسط' : language === 'en' ? 'Intermediate' : 'Intermédiaire'}
                  </div>
                  <div className="font-bold text-4xl md:text-5xl text-white leading-none mb-6" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    50€<small className="text-sm font-normal text-white/70 ml-1">/{language === 'ar' ? 'شهر' : language === 'en' ? 'month' : 'mois'}</small>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {language === 'ar'
                      ? 'رؤية معززة للمؤسسات النامية.'
                      : language === 'en'
                        ? 'Enhanced visibility for growing establishments.'
                        : 'Visibilité renforcée pour les établissements en croissance.'}
                  </p>
                </div>
              </div>

              {/* Premium */}
              <div className="p-8 md:p-10 bg-[#D4AF37]/10 transition-all duration-300 hover:bg-[#D4AF37]/15 flex flex-col justify-between relative">
                <div className="absolute top-4 right-4 bg-[#D4AF37] text-[#3B3B3B] text-[9px] tracking-[0.24em] uppercase font-bold px-3 py-1 rounded">
                  Signature
                </div>
                <div>
                  <div className="text-[#D4AF37] text-xs tracking-[0.26em] uppercase font-bold mb-6">
                    Premium
                  </div>
                  <div className="font-bold text-4xl md:text-5xl text-white leading-none mb-6" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    150 à 300€<small className="text-sm font-normal text-white/70 ml-1">/{language === 'ar' ? 'شهر' : language === 'en' ? 'month' : 'mois'}</small>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {language === 'ar'
                      ? 'إبراز ذو أولوية وتواجد تحريري على المنصة.'
                      : language === 'en'
                        ? 'Priority featuring and editorial presence on the platform.'
                        : 'Mise en avant prioritaire et présence éditoriale sur la plateforme.'}
                  </p>
                </div>
              </div>

              {/* Branding */}
              <div className="p-8 md:p-10 transition-all duration-300 hover:bg-[#D4AF37]/5 flex flex-col justify-between">
                <div>
                  <div className="text-[#D4AF37] text-xs tracking-[0.26em] uppercase font-bold mb-6">
                    Branding
                  </div>
                  <div className="font-bold text-4xl md:text-5xl text-white leading-none mb-6" style={{ fontFamily: "'Montserrat', sans-serif", textTransform: 'uppercase' }}>
                    Selon accord
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {language === 'ar'
                      ? 'تنسيق مخصص للعلامات التجارية والمؤسسات السفيرة.'
                      : language === 'en'
                        ? 'Tailored setup for ambassador brands and institutions.'
                        : 'Dispositif sur-mesure pour les marques et institutions ambassadrices.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer variant="verified" />
    </div>
  );
};

export default BecomeAffiliate;
