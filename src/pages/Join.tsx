import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import originalHeroAsset from "@/assets/hero-home-bg-naked-tinted-1920x1080.webp.asset.json";
import zelligeBrunAsset from "@/assets/backgr-brun-zelliges-2.webp.asset.json";
import koutoubiaVerticalBgAsset from "@/assets/hero-bg-koutoubia-zellige-vertical-tinted-v3-1080x1920.webp.asset.json";
import phoneMockupAsset from "@/assets/phone-mockup-hero.webp.asset.json";
import iphoneTabletMockupAsset from "@/assets/og-install-app-v54-front-3q-minus45deg-1080x1920.webp.asset.json";
import hiwStep2Mockup from "@/assets/hiw-step2-app-mockup.webp";
import hiwStep3Tourist from "@/assets/hiw-step3-tourist.png";

const heroImageDesktop = originalHeroAsset.url;
const heroImageTablet = zelligeBrunAsset.url;
const heroImageMobile = koutoubiaVerticalBgAsset.url;

const LABELS = {
  fr: {
    pageTitle: "Rejoindre One World Morocco — Devenir partenaire",
    heroAriaLabel: "Rejoindre One World Morocco",
    heroH1a: "Rejoignez le premier écosystème numérique",
    heroH1b: "éthique & solidaire",
    heroH1c: "au Maroc.",
    heroPara1: "Tourisme, commerce, artisanat, services et solidarité réunis dans une même plateforme à impact positif.",
    heroPara2: "Gagnez en visibilité auprès des voyageurs et habitants. Sans commission.",
    heroCheck1: "Consommez local",
    heroCheck2: "Voyagez autrement",
    heroCheck3: "Agissez pour tous",
    heroStat1: "🌍 Tout le Maroc",
    heroStat2: "🤝 Partenaires locaux",
    heroStat3: "✓ 0% de commission",
    heroCta: "REJOINDRE →",
    waysH2: "Quatre moyens puissants d'attirer plus de clients sans intermédiaire.",
    waysP: "Soyez référencé dans notre catalogue\u00a0et obtenez votre carte business avec QR code. Deux outils complémentaires pour convertir les utilisateurs en clients.",
    way1H3: "Publiez vos offres sur One World Morocco",
    way1Intro: "Soyez référencé dans notre catalogue et touchez les voyageurs et habitants qui découvrent des entreprises locales partout au Maroc.",
    way1Li1: "Soyez découvert by les voyageurs & habitants\u00a0de votre région",
    way1Li2label: "Référencé dans le catalogue :",
    way1Li3: "Plus de trafic et de réservations directes",
    way1Li4: "Mis en avant dans la recherche et dans l'agent IA",
    way1Li5: "Aucune commission sur les réservations",
    way1Tag: "Vos offres. Notre audience. Plus de réservations.",
    way2H3: "Créez vos cartes business (QR)",
    way2Intro: "Obtenez votre page personnelle et votre code QR. Quand les voyageurs sont devant vous, partagez-le et convertissez instantanément.",
    way2Li1: "Toutes vos canaux digitaux au même endroit",
    way2Li2label: "URL courte personnalisée :",
    way2Li3: "Partagez par code QR ou lien en un tap",
    way2Li4: "Mettez à jour offres, évènements, vidéos et photos à tout moment",
    way2Li5: "Profil vérifié inspire confiance aux clients",
    way2Cta: "En savoir +",
    way2Tag: "Votre carte. Votre QR. Plus de clients sur place.",
    way3H3: "Votre assistant IA",
    way3Intro: "Intégrez un assistant IA directement sur votre site pour répondre aux visiteurs 24/7, qualifier leurs demandes et booster vos conversions.",
    way3Li1: "Disponible 24/7 pour répondre à vos visiteurs",
    way3Li2: "Recherche & réponse vocale",
    way3Li3: "Répond en plusieurs langues automatiquement",
    way3Li4: "Qualifie les demandes et capture les leads",
    way3Li5: "Connaît vos offres, horaires et tarifs",
    way3Li6: "Intégration simple en quelques minutes",
    way3Tag: "Votre IA. Vos réponses. Plus de conversions.",
    way4H3: "Réseau social, engagez avec votre communauté",
    way4Intro: "Entretenez la relation avec vos clients, prospects et followers, poussez votre offre, actualité et évènements dans leur interface.",
    way4Li1: "Gardez le lien avec vos clients and followers",
    way4Li2: "Poussez offres, actualités et évènements",
    way4Li3: "Diffusez directement dans leur interface",
    way4Li4: "Fidélisez et engagez votre communauté",
    way4Li5: "Transformez vos followers en clients",
    way4Tag: "Votre communauté. Vos messages. Plus d'engagement.",
    hiwH2: "Comment fonctionne le programme de remises pour les utilisateurs de l'App ?",
    hiwP: "Trois étapes simples pour attirer plus de clients, sans commissions ni intermédiaires.",
    hiw1H3: "Inscrivez-vous et définissez la remise que vous souhaitez offrir",
    hiw1P: "Choisissez librement le pourcentage de remise accordé aux utilisateurs. Ajustable à tout moment depuis votre espace partenaire.",
    hiw2H3: "Nos abonnés voient votre offre dans l'application",
    hiw2P: "Votre entreprise gagne en visibilité auprès des voyageurs et habitants qui explorent One World Morocco partout au Maroc.",
    hiw3H3: "Les clients viennent directement chez vous, sans commissions",
    hiw3P: "Réservations en direct, tarifs transparents : vous gardez 100% de vos revenus, sans intermédiaire.",
    hiwBtn: "S'INSCRIRE",
    joinSubtitle: "REJOINDRE EN TANT QUE PARTENAIRE.",
    joinLead: "Abonnez-vous à One World Morocco en quelques étapes : enregistrez votre entreprise, définissez votre offre et commencez à attirer de nouveaux clients instantanément, sans frais cachés ni intermédiaires.",
    step1Label: "Étape 1",
    step1H3: "Remplissez le formulaire",
    step1P: "Fournissez le nom et les coordonnées de votre entreprise.",
    step2Label: "Étape 2",
    step2H3: "Définissez votre offre",
    step2P: "Vous pouvez la mettre à jour à tout moment.",
    step3Label: "Étape 3",
    step3H3: "Obtenez des clients",
    step3P: "Les voyageurs verront votre offre dans notre catalogue.",
    joinBtn: "S'INSCRIRE",
    whyH2: "Pourquoi les partenaires choisissent One World Morocco",
    whyP: "Une offre plus équitable que les OTA classiques — sans commission, sans intermédiaire.",
    cmpThFeature: "Fonctionnalité",
    cmpReco: "★ RECOMMANDÉ",
    cmpRow1Feature: "Commission + Avis Clients + Réseau social",
    cmpRow2Feature: "Avis Clients",
    cmpRow3Feature: "Réseau social",
    cmpRow4Feature: "Votre QR code",
    cmpRow5Feature: "Contact direct",
    cmpRow6Feature: "Carte business digitale",
    cmpRow7Feature: "Votre assistant IA",
    cmpRow8Feature: "URL courte personnalisée (oneworldmorocco.com/votrenom)",
    cmpRow9Feature: "Recherche & réponse vocale",
    cmpRow10Feature: "Vitesse de paiement",
    cmpRow10Us: "Instantané",
    cmpRow10Booking: "30–60 jours",
    cmpRow10Gyg: "2–4 semaines",
    cmpRow11Feature: "Votre système de paiement en ligne, sans intermédiaire (sous réserve d'acceptation par votre prestataire de paiement)",
    cmpRow12Feature: "Vous possédez les données client",
    cmpRow13Feature: "Liberté tarifaire",
    cmpUsOptional: "✓ Optionnel",
    cmpUsIncluded: "✓ Inclus",
    cmpUsFree: "✓ Gratuit",
    cmpUsYes: "✓ Oui",
    cmpNo: "✗ Non",
    cmpUs0: "0 %",
    whyBtn: "S'INSCRIRE",
  },
  en: {
    pageTitle: "Join One World Morocco — Become a Partner",
    heroAriaLabel: "Join One World Morocco",
    heroH1a: "Join the first",
    heroH1b: "ethical & inclusive",
    heroH1c: "digital ecosystem in Morocco.",
    heroPara1: "Tourism, commerce, crafts, services and solidarity united in a single positive-impact platform.",
    heroPara2: "Boost your visibility with travellers and locals. No commission.",
    heroCheck1: "Shop local",
    heroCheck2: "Travel differently",
    heroCheck3: "Act for everyone",
    heroStat1: "🌍 All of Morocco",
    heroStat2: "🤝 Local partners",
    heroStat3: "✓ 0% commission",
    heroCta: "JOIN →",
    waysH2: "Four powerful ways to attract more customers with no middleman.",
    waysP: "Get listed in our catalogue\u00a0and receive your business card with QR code. Two complementary tools to turn users into customers.",
    way1H3: "Publish your offers on One World Morocco",
    way1Intro: "Get listed in our catalogue and reach travellers and locals discovering local businesses across Morocco.",
    way1Li1: "Be discovered by travellers & locals\u00a0in your region",
    way1Li2label: "Listed in the catalogue:",
    way1Li3: "More traffic and direct bookings",
    way1Li4: "Featured in search and the AI agent",
    way1Li5: "Zero commission on bookings",
    way1Tag: "Your offers. Our audience. More bookings.",
    way2H3: "Create your business cards (QR)",
    way2Intro: "Get your personal page and QR code. When travellers are right in front of you, share it and convert instantly.",
    way2Li1: "All your digital channels in one place",
    way2Li2label: "Personalised short URL:",
    way2Li3: "Share by QR code or link in one tap",
    way2Li4: "Update offers, events, videos and photos any time",
    way2Li5: "Verified profile builds customer trust",
    way2Cta: "Learn more",
    way2Tag: "Your card. Your QR. More on-site customers.",
    way3H3: "Your AI assistant",
    way3Intro: "Embed an AI assistant directly on your website to answer visitors 24/7, qualify leads and boost your conversions.",
    way3Li1: "Available 24/7 to answer your visitors",
    way3Li2: "Voice search & response",
    way3Li3: "Responds in multiple languages automatically",
    way3Li4: "Qualifies requests and captures leads",
    way3Li5: "Knows your offers, opening hours and prices",
    way3Li6: "Simple integration in minutes",
    way3Tag: "Your AI. Your answers. More conversions.",
    way4H3: "Social network — engage with your community",
    way4Intro: "Maintain the relationship with your customers, prospects and followers, push your offers, news and events into their feed.",
    way4Li1: "Stay connected with your customers and followers",
    way4Li2: "Push offers, news and events",
    way4Li3: "Broadcast directly into their interface",
    way4Li4: "Retain and engage your community",
    way4Li5: "Turn your followers into customers",
    way4Tag: "Your community. Your messages. More engagement.",
    hiwH2: "How does the discount programme for App users work?",
    hiwP: "Three simple steps to attract more customers, with no commissions or middlemen.",
    hiw1H3: "Sign up and set the discount you want to offer",
    hiw1P: "Freely choose the discount percentage granted to users. Adjustable at any time from your partner dashboard.",
    hiw2H3: "Our subscribers see your offer in the app",
    hiw2P: "Your business gains visibility among travellers and locals exploring One World Morocco across Morocco.",
    hiw3H3: "Customers come directly to you, with no commissions",
    hiw3P: "Direct bookings, transparent prices: you keep 100% of your revenue, with no middleman.",
    hiwBtn: "SIGN UP",
    joinSubtitle: "JOIN AS A PARTNER.",
    joinLead: "Subscribe to One World Morocco in a few steps: register your business, set your offer and start attracting new customers instantly, with no hidden fees or middlemen.",
    step1Label: "Step 1",
    step1H3: "Fill in the form",
    step1P: "Provide your business name and contact details.",
    step2Label: "Step 2",
    step2H3: "Set your offer",
    step2P: "You can update it at any time.",
    step3Label: "Step 3",
    step3H3: "Get customers",
    step3P: "Travellers will see your offer in our catalogue.",
    joinBtn: "SIGN UP",
    whyH2: "Why partners choose One World Morocco",
    whyP: "A fairer deal than classic OTAs — no commission, no middleman.",
    cmpThFeature: "Feature",
    cmpReco: "★ RECOMMENDED",
    cmpRow1Feature: "Commission + Customer Reviews + Social network",
    cmpRow2Feature: "Customer Reviews",
    cmpRow3Feature: "Social network",
    cmpRow4Feature: "Your QR code",
    cmpRow5Feature: "Direct contact",
    cmpRow6Feature: "Digital business card",
    cmpRow7Feature: "Your AI assistant",
    cmpRow8Feature: "Personalised short URL (oneworldmorocco.com/yourname)",
    cmpRow9Feature: "Voice search & response",
    cmpRow10Feature: "Payment speed",
    cmpRow10Us: "Instant",
    cmpRow10Booking: "30–60 days",
    cmpRow10Gyg: "2–4 weeks",
    cmpRow11Feature: "Your own online payment system, no middleman (subject to acceptance by your payment provider)",
    cmpRow12Feature: "You own the customer data",
    cmpRow13Feature: "Pricing freedom",
    cmpUsOptional: "✓ Optional",
    cmpUsIncluded: "✓ Included",
    cmpUsFree: "✓ Free",
    cmpUsYes: "✓ Yes",
    cmpNo: "✗ No",
    cmpUs0: "0 %",
    whyBtn: "SIGN UP",
  },
  ar: {
    pageTitle: "انضم إلى One World Morocco — كن شريكًا",
    heroAriaLabel: "انضم إلى One World Morocco",
    heroH1a: "انضم إلى أول نظام بيئي رقمي",
    heroH1b: "أخلاقي وتضامني",
    heroH1c: "في المغرب.",
    heroPara1: "السياحة والتجارة والحرف اليدوية والخدمات والتضامن في منصة واحدة ذات أثر إيجابي.",
    heroPara2: "عزِّز ظهورك أمام المسافرين والسكان المحليين. بدون عمولة.",
    heroCheck1: "استهلك محليًا",
    heroCheck2: "سافر بشكل مختلف",
    heroCheck3: "تصرّف من أجل الجميع",
    heroStat1: "🌍 المغرب بأكمله",
    heroStat2: "🤝 شركاء محليون",
    heroStat3: "✓ 0% عمولة",
    heroCta: "انضم ←",
    waysH2: "أربع طرق فعّالة لجذب المزيد من العملاء بدون وسطاء.",
    waysP: "سجِّل في كتالوجنا\u00a0واحصل على بطاقة عملك مع رمز QR. أداتان متكاملتان لتحويل المستخدمين إلى عملاء.",
    way1H3: "انشر عروضك على One World Morocco",
    way1Intro: "سجِّل في كتالوجنا وتواصل مع المسافرين والسكان الذين يكتشفون الشركات المحلية في أرجاء المغرب.",
    way1Li1: "اكتشف من قِبل المسافرين والسكان\u00a0في منطقتك",
    way1Li2label: "مُدرج في الكتالوج:",
    way1Li3: "مزيد من الزيارات والحجوزات المباشرة",
    way1Li4: "مميَّز في نتائج البحث ووكيل الذكاء الاصطناعي",
    way1Li5: "صفر عمولة على الحجوزات",
    way1Tag: "عروضك. جمهورنا. المزيد من الحجوزات.",
    way2H3: "أنشئ بطاقات عملك (QR)",
    way2Intro: "احصل على صفحتك الشخصية ورمز QR. عندما يكون المسافرون أمامك مباشرةً، شاركه وحوِّلهم فورًا.",
    way2Li1: "جميع قنواتك الرقمية في مكان واحد",
    way2Li2label: "رابط قصير مخصص:",
    way2Li3: "شارك برمز QR أو رابط بنقرة واحدة",
    way2Li4: "حدِّث العروض والفعاليات والمقاطع والصور في أي وقت",
    way2Li5: "الملف الشخصي الموثَّق يبني ثقة العملاء",
    way2Cta: "اعرف المزيد",
    way2Tag: "بطاقتك. رمز QR الخاص بك. المزيد من العملاء في الموقع.",
    way3H3: "مساعدك بالذكاء الاصطناعي",
    way3Intro: "ادمج مساعدًا ذكيًا مباشرةً في موقعك للرد على الزوار 24/7 وتأهيل طلباتهم وتعزيز معدلات التحويل.",
    way3Li1: "متاح 24/7 للرد على زوارك",
    way3Li2: "بحث ورد صوتي",
    way3Li3: "يرد بلغات متعددة تلقائيًا",
    way3Li4: "يؤهّل الطلبات ويستقطب العملاء المحتملين",
    way3Li5: "يعرف عروضك وأوقات عملك وأسعارك",
    way3Li6: "تكامل بسيط في دقائق",
    way3Tag: "ذكاؤك الاصطناعي. إجاباتك. المزيد من التحويلات.",
    way4H3: "الشبكة الاجتماعية — تفاعل مع مجتمعك",
    way4Intro: "حافظ على علاقتك بعملائك والمتابعين، وادفع عروضك وأخبارك وفعالياتك إلى واجهتهم.",
    way4Li1: "ابقَ على تواصل مع عملائك ومتابعيك",
    way4Li2: "ادفع العروض والأخبار والفعاليات",
    way4Li3: "بثّ مباشرةً في واجهتهم",
    way4Li4: "عزِّز ولاء مجتمعك وتفاعله",
    way4Li5: "حوِّل متابعيك إلى عملاء",
    way4Tag: "مجتمعك. رسائلك. المزيد من التفاعل.",
    hiwH2: "كيف يعمل برنامج الخصومات لمستخدمي التطبيق؟",
    hiwP: "ثلاث خطوات بسيطة لاستقطاب المزيد من العملاء، بدون عمولات أو وسطاء.",
    hiw1H3: "سجِّل وحدِّد الخصم الذي تريد تقديمه",
    hiw1P: "اختر بحرية نسبة الخصم الممنوحة للمستخدمين. قابل للتعديل في أي وقت من لوحة تحكم الشريك.",
    hiw2H3: "يرى مشتركونا عرضك في التطبيق",
    hiw2P: "تكتسب شركتك ظهورًا أوسع بين المسافرين والسكان الذين يستكشفون One World Morocco في المغرب.",
    hiw3H3: "يأتي العملاء إليك مباشرةً بدون عمولات",
    hiw3P: "حجوزات مباشرة وأسعار شفافة: تحتفظ بـ100% من إيراداتك بدون وسيط.",
    hiwBtn: "سجِّل الآن",
    joinSubtitle: "انضم كشريك.",
    joinLead: "اشترك في One World Morocco في خطوات بسيطة: سجِّل شركتك، وحدِّد عرضك، وابدأ في استقطاب عملاء جدد فورًا بدون رسوم خفية أو وسطاء.",
    step1Label: "الخطوة 1",
    step1H3: "املأ النموذج",
    step1P: "أدخل اسم شركتك وبياناتها.",
    step2Label: "الخطوة 2",
    step2H3: "حدِّد عرضك",
    step2P: "يمكنك تحديثه في أي وقت.",
    step3Label: "الخطوة 3",
    step3H3: "احصل على عملاء",
    step3P: "سيرى المسافرون عرضك في كتالوجنا.",
    joinBtn: "سجِّل الآن",
    whyH2: "لماذا يختار الشركاء One World Morocco",
    whyP: "صفقة أكثر إنصافًا من وكالات السفر الإلكترونية التقليدية — بدون عمولة ولا وسيط.",
    cmpThFeature: "الميزة",
    cmpReco: "★ موصى به",
    cmpRow1Feature: "عمولة + آراء العملاء + شبكة اجتماعية",
    cmpRow2Feature: "آراء العملاء",
    cmpRow3Feature: "شبكة اجتماعية",
    cmpRow4Feature: "رمز QR الخاص بك",
    cmpRow5Feature: "تواصل مباشر",
    cmpRow6Feature: "بطاقة العمل الرقمية",
    cmpRow7Feature: "مساعدك بالذكاء الاصطناعي",
    cmpRow8Feature: "رابط قصير مخصص (oneworldmorocco.com/اسمك)",
    cmpRow9Feature: "بحث ورد صوتي",
    cmpRow10Feature: "سرعة الدفع",
    cmpRow10Us: "فوري",
    cmpRow10Booking: "30–60 يومًا",
    cmpRow10Gyg: "2–4 أسابيع",
    cmpRow11Feature: "نظام الدفع الإلكتروني الخاص بك بدون وسيط (رهنًا بقبول مزود الدفع لديك)",
    cmpRow12Feature: "أنت تمتلك بيانات العملاء",
    cmpRow13Feature: "حرية التسعير",
    cmpUsOptional: "✓ اختياري",
    cmpUsIncluded: "✓ مشمول",
    cmpUsFree: "✓ مجاني",
    cmpUsYes: "✓ نعم",
    cmpNo: "✗ لا",
    cmpUs0: "0 %",
    whyBtn: "سجِّل الآن",
  },
} as const;

const CSS = `
  .join-page{--bg:#ECD6B8;--ink:#0f0f0f;--muted:#6b6b6b;--line:#ececec;--orange:#ff6b35;--orange-deep:#e85a26;--green:#00a896;--gold:#ffc008;background:var(--bg);color:var(--ink);font-family:'Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif,system-ui,sans-serif;line-height:1.55;-webkit-font-smoothing:antialiased}
  .join-page *{box-sizing:border-box}
  @keyframes hero-zoom-light{0%,100%{transform:scale(1.05)}50%{transform:scale(1.12)}}
  @media (max-width:767px){.join-page .hero-bg{animation:hero-zoom-light 18s ease-in-out infinite !important}}
  .join-page .wrap{max-width:1240px;margin:0 auto;padding:0 24px}
  .join-page section{padding:80px 0;border-bottom:1px solid var(--line)}
  .join-page .section-head{display:grid;grid-template-columns:1.1fr 1fr;gap:48px;align-items:end;margin-bottom:56px}
  .join-page .subtitle{font-family:'Montserrat',sans-serif;font-weight:700;font-size:clamp(34px,5vw,64px);line-height:1;letter-spacing:-.01em;text-transform:uppercase}
  .join-page .lead{color:var(--muted);font-size:17px;max-width:520px}
  @media (max-width:880px){.join-page .section-head{grid-template-columns:1fr;gap:20px}}
  .join-page .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;position:relative}
  @media (max-width:980px){.join-page .steps{grid-template-columns:1fr}}
  .join-page .step{position:relative;border:1px solid var(--line);border-radius:24px;padding:32px 28px 36px;background:#fff;overflow:hidden;transition:transform .25s,box-shadow .25s}
  .join-page .step:hover{transform:translateY(-4px);box-shadow:0 18px 40px -20px rgba(0,0,0,.18)}
  .join-page .step .num{position:absolute;right:18px;top:-10px;font-family:'Montserrat',sans-serif;font-weight:700;font-size:180px;line-height:1;color:#f3f3f3;pointer-events:none;user-select:none}
  .join-page .step .ico{width:48px;height:48px;display:flex;align-items:center;justify-content:center;margin-bottom:46px;position:relative;z-index:1}
  .join-page .step .step-label{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;position:relative;z-index:1}
  .join-page .step h3{font-family:'Montserrat',sans-serif;font-weight:700;font-size:22px;margin-bottom:10px;position:relative;z-index:1}
  .join-page .step p{color:var(--muted);font-size:15px;position:relative;z-index:1}
  .join-page .cta-row{display:flex;justify-content:center;margin-top:56px}
  .join-page .btn-primary{display:inline-flex;align-items:center;gap:10px;background:#C04F17;color:#fff;padding:18px 44px;border-radius:999px;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:14px;box-shadow:0 14px 30px -12px rgba(192,79,23,.6);transition:transform .2s,background .2s}
  .join-page .btn-primary:hover{background:#a84313;transform:translateY(-2px)}
  .join-page .t-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
  @media (max-width:980px){.join-page .t-grid{grid-template-columns:1fr}}
  .join-page .t-card{position:relative;border-radius:24px;overflow:hidden;aspect-ratio:4/5;background:#222}
  .join-page .t-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .join-page .t-card::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.85) 0%,rgba(0,0,0,.35) 45%,rgba(0,0,0,0) 70%)}
  .join-page .t-badge{position:absolute;top:24px;left:24px;color:#fff;font-family:'Montserrat',sans-serif;z-index:2;text-align:center;padding:10px 18px}
  .join-page .t-badge::before{content:"";position:absolute;inset:0;border:2px solid #fff;border-radius:50%;transform:rotate(-8deg) scale(1.15);opacity:.95}
  .join-page .t-badge strong{display:block;font-size:28px;font-weight:700;line-height:1}
  .join-page .t-badge span{font-size:10px;letter-spacing:.2em;text-transform:uppercase;opacity:.9}
  .join-page .t-body{position:absolute;left:24px;right:24px;bottom:24px;color:#fff;z-index:2}
  .join-page .t-body p{font-size:15px;line-height:1.5;margin-bottom:14px}
  .join-page .t-meta h4{font-family:'Montserrat',sans-serif;font-size:16px;font-weight:600;margin-bottom:2px}
  .join-page .t-meta span{font-size:12px;opacity:.85;letter-spacing:.1em;text-transform:uppercase}
  .join-page .ways-head{text-align:center;max-width:780px;margin:0 auto 56px}
  .join-page .ways-head h2{font-family:'Montserrat',sans-serif;font-weight:700;font-size:clamp(30px,4.4vw,52px);line-height:1.05;letter-spacing:-.01em;margin-bottom:18px}
  .join-page .ways-head p{color:var(--muted);font-size:17px}
  .join-page .ways{display:grid;grid-template-columns:repeat(2,1fr);gap:28px;max-width:980px;margin:0 auto}
  @media (max-width:680px){.join-page .ways{grid-template-columns:1fr}}
  .join-page .way{border-radius:28px;padding:44px 44px 36px;position:relative;overflow:hidden;display:flex;flex-direction:column}
  .join-page .hiw-illu{margin:0 auto 22px;max-width:240px}
  .join-page .hiw-illu svg{width:100%;height:auto;display:block}
  .join-page .way.green{background:#194CFF;color:#fff}
  .join-page .way.orange{background:#8F7950;color:#fff}
  .join-page .way.teal{background:#C04F17;color:#fff}
  .join-page .way.purple{background:#3B3B3B;color:#fff}
  .join-page .way .badge{width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Montserrat',sans-serif;font-weight:700;font-size:24px;color:#194CFF;background:#fff;margin-bottom:22px}
  .join-page .way.orange .badge{background:#fff;color:#8F7950}
  .join-page .way.teal .badge{background:#fff;color:#C04F17}
  .join-page .way.purple .badge{background:#fff;color:#3B3B3B}
  .join-page .way h3{font-family:'Montserrat',sans-serif;font-weight:700;font-size:clamp(24px,2.6vw,32px);line-height:1.15;margin-bottom:18px;color:#111}
  .join-page .way.green h3{color:#fff}
  .join-page .way.orange h3{color:#fff}
  .join-page .way.teal h3{color:#fff}
  .join-page .way.purple h3{color:#fff}
  .join-page .way > p.intro{color:#3a3a3a;font-size:16px;line-height:1.6;margin-bottom:26px;max-width:520px}
  .join-page .way.green > p.intro{color:rgba(255,255,255,.92)}
  .join-page .way.orange > p.intro{color:rgba(255,255,255,.92)}
  .join-page .way.teal > p.intro{color:rgba(255,255,255,.92)}
  .join-page .way.purple > p.intro{color:rgba(255,255,255,.92)}
  .join-page .way ul{list-style:none;padding:0;margin:0 0 28px;display:flex;flex-direction:column;gap:14px}
  .join-page .way li{display:flex;gap:12px;align-items:flex-start;font-size:15px;color:#222;line-height:1.45}
  .join-page .way.green li{color:#fff}
  .join-page .way.orange li{color:#fff}
  .join-page .way.teal li{color:#fff}
  .join-page .way.purple li{color:#fff}
  .join-page .way li svg{flex:0 0 22px;margin-top:1px}
  .join-page .way .way-cta{display:inline-flex;align-items:center;gap:10px;padding:16px 28px;border-radius:999px;color:#fff;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:.04em;transition:transform .2s,filter .2s}
  .join-page .way .way-cta:hover{transform:translateY(-2px);filter:brightness(1.05)}
  .join-page .way.green .way-cta{background:#fff;color:#194CFF}
  .join-page .way.orange .way-cta{background:#fff;color:#8F7950}
  .join-page .way.teal .way-cta{background:#fff;color:#C04F17}
  .join-page .way.purple .way-cta{background:#fff;color:#3B3B3B}
  .join-page .way .tag{margin-top:26px;padding-top:22px;border-top:1px solid rgba(0,0,0,.08);text-align:center;font-family:'Montserrat',sans-serif;font-weight:700;font-size:15px}
  .join-page .way.green .tag{color:#fff;border-top-color:rgba(255,255,255,.25)}
  .join-page .way.orange .tag{color:#fff;border-top-color:rgba(255,255,255,.25)}
  .join-page .way.teal .tag{color:#fff;border-top-color:rgba(255,255,255,.25)}
  .join-page .way.purple .tag{color:#fff;border-top-color:rgba(255,255,255,.25)}
  .join-page .hiw-head{text-align:center;max-width:820px;margin:0 auto 56px}
  .join-page .hiw-head h2{font-family:'Montserrat',sans-serif;font-weight:700;font-size:clamp(30px,4.4vw,52px);line-height:1.05;letter-spacing:-.01em;margin-bottom:18px}
  .join-page .hiw-head p{color:var(--muted);font-size:17px}
  .join-page .hiw{display:grid;grid-template-columns:1fr 40px 1fr 40px 1fr;gap:18px;align-items:stretch}
  .join-page .hiw-arrow{display:flex;align-items:center;justify-content:center;color:var(--orange)}
  .join-page .hiw-arrow svg{width:40px;height:40px;animation:hiwArrowSlide 1.6s ease-in-out infinite}
  @keyframes hiwArrowSlide{0%,100%{transform:translateX(-6px);opacity:.55}50%{transform:translateX(6px);opacity:1}}
  @media (prefers-reduced-motion:reduce){.join-page .hiw-arrow svg{animation:none}}
  @media (max-width:980px){
    .join-page .hiw{grid-template-columns:1fr;gap:28px}
    .join-page .hiw-arrow{transform:rotate(90deg);margin:-6px 0}
    .join-page .hiw-arrow svg{animation:hiwArrowSlideV 1.6s ease-in-out infinite}
    @keyframes hiwArrowSlideV{0%,100%{transform:translateX(-6px);opacity:.55}50%{transform:translateX(6px);opacity:1}}
  }
  .join-page .hiw-step{background:#fff;border:1px solid var(--line);border-radius:24px;padding:36px 28px;text-align:center;position:relative;transition:transform .25s,box-shadow .25s}
  .join-page .hiw-step:hover{transform:translateY(-4px);box-shadow:0 18px 40px -20px rgba(0,0,0,.18)}
  .join-page .hiw-step .hiw-num{width:56px;height:56px;border-radius:50%;background:var(--orange);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Montserrat',sans-serif;font-weight:700;font-size:24px;margin:0 auto 22px}
  .join-page .hiw-step h3{font-family:'Montserrat',sans-serif;font-weight:700;font-size:20px;margin-bottom:12px;line-height:1.25}
  .join-page .hiw-step p{color:var(--muted);font-size:15px;line-height:1.55}
  .join-page .hiw-cta{display:flex;justify-content:center;margin-top:48px}
  .join-page .hero{position:relative;padding:0;border-bottom:1px solid var(--line);overflow:hidden}
  .join-page .hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .join-page .hero-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,.35) 40%,rgba(0,0,0,.65) 100%)}
  .join-page .hero-inner{position:relative;z-index:1;max-width:1240px;margin:0 auto;padding:120px 24px 110px;text-align:center;color:#fff}
  .join-page .hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(0,0,0,.45);backdrop-filter:blur(8px);color:#fff;padding:8px 18px;border-radius:999px;font-family:'Montserrat',sans-serif;font-weight:600;font-size:12px;letter-spacing:.22em;text-transform:uppercase;margin-bottom:28px;border:1px solid rgba(255,255,255,.18)}
  .join-page .hero h1{font-family:'Montserrat',sans-serif;font-weight:700;line-height:1.2;letter-spacing:-.01em;margin:0 auto 22px;max-width:980px}
  .join-page .hero h1 .hl{color:#ffc008}
  .join-page .hero .hero-sub{font-size:clamp(16px,1.4vw,19px);color:rgba(255,255,255,.92);max-width:680px;margin:0 auto 34px;line-height:1.5}
  .join-page .hero .hero-cta{display:inline-flex;align-items:center;gap:10px;background:#C04F17;color:#ffffff;padding:18px 44px;border-radius:999px;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:14px;box-shadow:0 14px 30px -12px rgba(192,79,23,.7);transition:transform .2s,background .2s}
  .join-page .hero .hero-cta:hover{background:#a84313;transform:translateY(-2px)}
  .join-page .hero-checks{display:flex;flex-wrap:wrap;justify-content:center;gap:22px;margin-top:22px;font-size:14px;color:rgba(255,255,255,.95)}
  .join-page .hero-checks span{display:inline-flex;align-items:center;gap:8px}
  .join-page .hero-checks svg{color:var(--green)}
  @media (max-width: 640px) {
    .join-page .hero-checks {
      flex-direction: column;
      align-items: flex-start;
      width: fit-content;
      margin-left: auto;
      margin-right: auto;
      gap: 12px;
    }
  }
  .join-page .hero-stats{margin-top:38px;display:inline-flex;flex-wrap:wrap;justify-content:center;gap:0;background:rgba(0,0,0,.45);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:10px 8px;font-size:13px}
  .join-page .hero-stats div{padding:6px 22px;display:inline-flex;align-items:center;gap:8px;color:#fff;border-right:1px solid rgba(255,255,255,.18)}
  .join-page .hero-stats div:last-child{border-right:none}
  @media (max-width:700px){
    .join-page .hero-inner{padding:90px 20px 80px}
    .join-page .hero-stats{display:none !important}
  }
  .join-page .why-head{text-align:center;max-width:900px;margin:0 auto 48px}
  .join-page .why-head h2{font-family:'Montserrat',sans-serif;font-weight:700;font-size:clamp(30px,4.4vw,52px);line-height:1.05;letter-spacing:-.01em;margin-bottom:16px;text-transform:uppercase}
  .join-page .why-head p{color:var(--muted);font-size:17px;max-width:620px;margin:0 auto}
  .join-page .why-wrap{background:#BED1FF;border-radius:32px;padding:32px;overflow-x:auto;-webkit-overflow-scrolling:touch}
  .join-page .cmp{width:100%;background:#fff;border-radius:20px;overflow:hidden;border-collapse:separate;border-spacing:0;font-size:15px}
  .join-page .cmp th,.join-page .cmp td{padding:18px 22px;text-align:center;border-bottom:1px solid #eef2f0;vertical-align:middle}
  .join-page .cmp th:first-child,.join-page .cmp td:first-child{text-align:left;color:#444;font-weight:500}
  .join-page .cmp thead th{font-family:'Montserrat',sans-serif;font-weight:600;font-size:16px;color:#1a1a1a;padding:24px 22px;background:#fff;border-bottom:1px solid #eef2f0}
  .join-page .cmp thead th.us{background:#194CFF;color:#fff;position:relative;padding-top:42px}
  .join-page .cmp thead th.us .reco{position:absolute;top:14px;left:50%;transform:translateX(-50%);background:#C04F17;color:#fff;font-size:11px;font-weight:700;letter-spacing:.08em;padding:4px 12px;border-radius:999px;white-space:nowrap}
  .join-page .cmp tbody td.us{background:#BED1FF;color:#194CFF;font-weight:700}
  .join-page .cmp tbody tr:last-child td{border-bottom:none}
  .join-page .cmp .wow{display:inline-block;margin-left:8px;background:#FF6B35;color:#fff;font-size:10px;font-weight:700;letter-spacing:.08em;padding:2px 8px;border-radius:999px;vertical-align:middle}
  .join-page .cmp .x{color:#9aa3a0}
  .join-page .why-cta{display:flex;justify-content:center;margin-top:40px}
  @media (max-width:760px){.join-page .why-wrap{padding:14px;border-radius:22px}.join-page .cmp{font-size:12px;min-width:640px}.join-page .cmp th,.join-page .cmp td{padding:12px 10px}.join-page .cmp thead th{font-size:13px}}
`;

const Check = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="10" stroke={color} strokeWidth="1.6" />
    <path d="M6.5 11.3l3 3 6-6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Join = () => {
  const { language } = useLanguage();
  const L = LABELS[language] ?? LABELS.fr;

  useEffect(() => {
    if (!document.getElementById("join-fonts")) {
      const l = document.createElement("link");
      l.id = "join-fonts";
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap";
      document.head.appendChild(l);
    }
    document.title = L.pageTitle;
  }, [L.pageTitle]);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".join-page .why-wrap");
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const canScrollX = el.scrollWidth > el.clientWidth;
      if (!canScrollX) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && e.deltaY > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const heroSectionRef = useRef<HTMLElement>(null);
  const heroBgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const hero = heroSectionRef.current;
    if (!hero) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let mx = 0, my = 0, tx = 0, ty = 0, sy = 0, ticking = false;
    const update = () => {
      tx += (mx - tx) * 0.08;
      ty += (my - ty) * 0.08;
      hero.style.setProperty('--mx', tx.toFixed(3));
      hero.style.setProperty('--my', ty.toFixed(3));
      hero.style.setProperty('--sy', sy.toFixed(3));
      if (Math.abs(mx - tx) > 0.001 || Math.abs(my - ty) > 0.001) {
        requestAnimationFrame(update);
      } else ticking = false;
    };
    const kick = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    const onMove = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;
      kick();
    };
    const onLeave = () => { mx = 0; my = 0; kick(); };
    const onScroll = () => {
      const r = hero.getBoundingClientRect();
      sy = Math.max(-1, Math.min(1, -r.top / r.height));
      kick();
    };
    hero.addEventListener('mousemove', onMove);
    hero.addEventListener('mouseleave', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      hero.removeEventListener('mousemove', onMove);
      hero.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    const el = heroBgRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        el.style.transform = `translate3d(0, ${y * 0.3}px, 0)`;
        raf = 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <HomeMindtripHeader />
      <div className="join-page">
        <style>{CSS}</style>

      <section ref={heroSectionRef} className="hero hero-parallax relative min-h-[92vh] w-full overflow-hidden flex items-center justify-center border-b border-white/10" style={{ ['--mx' as any]: 0, ['--my' as any]: 0, ['--sy' as any]: 0 }} aria-label={L.heroAriaLabel}>
        <picture>
          <source media="(max-width: 767px)" srcSet={heroImageMobile} />
          <source media="(max-width: 1023px)" srcSet={heroImageTablet} />
          <img
            ref={heroBgRef}
            src={heroImageDesktop}
            alt="Maroc — riad, piscine et tagine, composition réalisme magique"
            className="hero-bg absolute inset-0 h-full w-full object-cover will-change-transform lg:h-[100%]"
            loading="eager"
            fetchPriority="high"
          />
        </picture>
        {/* Dark overlay on tablet to ensure text readability over zellige pattern */}
        <div className="hidden md:block lg:hidden absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50 z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/50 md:hidden z-10" />
        <div className="absolute inset-x-0 bottom-0 h-[18vh] bg-gradient-to-t from-black/40 via-black/15 to-transparent md:hidden z-10" />

        {/* Floating phone mockup — left side, desktop only */}
        <img
          src={phoneMockupAsset.url}
          alt="Application One World Morocco sur iPhone"
          aria-hidden="true"
          className="hidden lg:block pointer-events-none select-none absolute left-[2%] xl:left-[5%] top-1/2 -translate-y-1/2 h-[64%] w-auto z-20 drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)] animate-[heroPhoneFloat_6s_ease-in-out_infinite]"
        />
        {/* Floating iPhone mockup — right side, tablet only (768px to 1023px) */}
        <img
          src={iphoneTabletMockupAsset.url}
          alt="Application One World Morocco — Koutoubia"
          aria-hidden="true"
          className="hidden md:block lg:hidden pointer-events-none select-none absolute right-[3%] top-1/2 -translate-y-1/2 md:max-lg:top-[38%] md:max-lg:h-[48%] w-auto z-20 drop-shadow-[0_25px_50px_rgba(0,0,0,0.5)] animate-[heroPhoneFloat_4.5s_ease-in-out_infinite]"
        />
        <style>{`
          @keyframes heroPhoneFloat {
            0%, 100% { transform: translateY(calc(-50% - 8px)); }
            50% { transform: translateY(calc(-50% + 8px)); }
          }
          .hero-parallax { perspective: 1200px; }
          .hero-parallax .hero-content {
            transform: translate3d(0, calc(var(--sy)*-30px), 0);
            transition: transform .5s cubic-bezier(.2,.7,.2,1);
            will-change: transform;
          }
          @keyframes heroRise { from { opacity: 0; transform: translateY(34px); } to { opacity: 1; transform: none; } }
          .hero-rise { opacity: 0; animation: heroRise 1s forwards; }
          @media (prefers-reduced-motion: reduce) {
            section img[alt^="Application One World"] { animation: none !important; }
            .hero-parallax .hero-content { transform: none !important; }
          }
        `}</style>

         <div className="hero-content relative z-30 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 pt-16 pb-12 sm:py-24 flex flex-col items-center justify-center text-center">
          <h1 style={{ fontFamily: "Montserrat, sans-serif", animationDelay: '.45s', animationFillMode: 'forwards' }} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] font-bold text-center mb-6 leading-[1.2] tracking-tight max-w-3xl text-[26px] sm:text-4xl md:text-5xl lg:text-6xl hero-rise">
            {L.heroH1a} <span className="text-[#ffc008]">{L.heroH1b}</span> {L.heroH1c}
          </h1>
          <p style={{ animationDelay: '.66s', animationFillMode: 'forwards' }} className="hero-sub text-white max-w-2xl text-center mb-4 text-base sm:text-lg opacity-95 hero-rise">{L.heroPara1}</p>
          <p style={{ animationDelay: '.78s', animationFillMode: 'forwards' }} className="hero-sub text-white max-w-2xl text-center mb-8 text-base sm:text-lg opacity-95 hero-rise">{L.heroPara2}</p>

          <div className="hero-checks hero-rise" style={{ animationDelay: '.88s', animationFillMode: 'forwards' }}>
            <span><Check color="#00a896" />{L.heroCheck1}</span>
            <span><Check color="#00a896" />{L.heroCheck2}</span>
            <span><Check color="#00a896" />{L.heroCheck3}</span>
          </div>
          <div className="hero-stats mb-8 hidden sm:inline-flex hero-rise" style={{ animationDelay: '.92s', animationFillMode: 'forwards' }}>
            <div>{L.heroStat1}</div>
            <div>{L.heroStat2}</div>
            <div>{L.heroStat3}</div>
          </div>

          <Link to="/devenir-affilie" style={{ animationDelay: '.98s', animationFillMode: 'forwards' }} className="hero-cta mt-4 hero-rise">{L.heroCta}</Link>
        </div>
      </section>

      <section id="ways">
        <div className="wrap">
          <div className="ways-head">
            <h2>{L.waysH2}</h2>
            <p>{L.waysP}</p>
          </div>

          <div className="ways">
            <article className="way green">
              <div className="badge">1</div>
              <h3>{L.way1H3}</h3>
              <p className="intro">{L.way1Intro}</p>
              <ul>
                <li><Check color="#ffffff" />{L.way1Li1}</li>
                <li><Check color="#ffffff" /><span>{L.way1Li2label}<br /><strong style={{display:'block',marginTop:4}}>oneworldmorocco.com/votrenom</strong></span></li>
                <li><Check color="#ffffff" />{L.way1Li3}</li>
                <li><Check color="#ffffff" />{L.way1Li4}</li>
                <li><Check color="#ffffff" />{L.way1Li5}</li>
              </ul>
              <div className="tag">{L.way1Tag}</div>
            </article>

            <article className="way orange">
              <div className="badge">2</div>
              <h3>{L.way2H3}</h3>
              <p className="intro">{L.way2Intro}</p>
              <ul>
                <li><Check color="#ffffff" />{L.way2Li1}</li>
                <li><Check color="#ffffff" /><span>{L.way2Li2label}<br /><strong style={{display:'block',marginTop:4}}>oneworldmorocco.com/votrenom</strong></span></li>
                <li><Check color="#ffffff" />{L.way2Li3}</li>
                <li><Check color="#ffffff" />{L.way2Li4}</li>
                <li><Check color="#ffffff" />{L.way2Li5}</li>
              </ul>
              <Link to="/card" className="way-cta" style={{ alignSelf: "center", marginTop: 4, marginBottom: 14 }}>{L.way2Cta}</Link>
              <div className="tag">{L.way2Tag}</div>
            </article>

            <article className="way teal">
              <div className="badge">3</div>
              <h3>{L.way3H3}</h3>
              <p className="intro">{L.way3Intro}</p>
              <ul>
                <li><Check color="#ffffff" />{L.way3Li1}</li>
                <li><Check color="#ffffff" />{L.way3Li2}</li>
                <li><Check color="#ffffff" />{L.way3Li3}</li>
                <li><Check color="#ffffff" />{L.way3Li4}</li>
                <li><Check color="#ffffff" />{L.way3Li5}</li>
                <li><Check color="#ffffff" />{L.way3Li6}</li>
              </ul>
              <div className="tag">{L.way3Tag}</div>
            </article>

            <article className="way purple">
              <div className="badge">4</div>
              <h3>{L.way4H3}</h3>
              <p className="intro">{L.way4Intro}</p>
              <ul>
                <li><Check color="#ffffff" />{L.way4Li1}</li>
                <li><Check color="#ffffff" />{L.way4Li2}</li>
                <li><Check color="#ffffff" />{L.way4Li3}</li>
                <li><Check color="#ffffff" />{L.way4Li4}</li>
                <li><Check color="#ffffff" />{L.way4Li5}</li>
              </ul>
              <div className="tag">{L.way4Tag}</div>
            </article>
          </div>
        </div>
      </section>

      <section id="how-it-works">
        <div className="wrap">
          <div className="hiw-head">
            <h2>{L.hiwH2}</h2>
            <p>{L.hiwP}</p>
          </div>

          <div className="hiw">
            <article className="hiw-step">
              <div className="hiw-illu" aria-hidden="true">
                <svg width="100%" height="100%" viewBox="0 0 327 196" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g filter="url(#hd0)">
                    <rect x="196.896" y="40.8579" width="106.075" height="106.075" rx="18.8578" transform="rotate(10 196.896 40.8579)" fill="#D1F2EB"/>
                    <rect x="197.852" y="42.2233" width="103.718" height="103.718" rx="17.6792" transform="rotate(10 197.852 42.2233)" stroke="white" strokeWidth="2.35722"/>
                  </g>
                  <text x="244" y="105" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="700" fontSize="22" fill="#C04F17" transform="rotate(10 244 105)">-20%</text>
                  <g filter="url(#hd1)">
                    <rect x="25.9977" y="59.2777" width="106.075" height="106.075" rx="18.8578" transform="rotate(-10 25.9977 59.2777)" fill="#FFF2CE"/>
                    <rect x="27.363" y="60.2338" width="103.718" height="103.718" rx="17.6792" transform="rotate(-10 27.363 60.2338)" stroke="white" strokeWidth="2.35722"/>
                  </g>
                  <text x="82" y="118" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="700" fontSize="22" fill="#8F7950" transform="rotate(-10 82 118)">-5%</text>
                  <g filter="url(#hd2)">
                    <rect x="103.785" y="22.0002" width="117.861" height="117.861" rx="18.8578" fill="#FFDDD3"/>
                    <rect x="104.964" y="23.1789" width="115.504" height="115.504" rx="17.6792" stroke="white" strokeWidth="2.35722"/>
                  </g>
                  <text x="162.7" y="95" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="700" fontSize="32" fill="#194CFF">-10%</text>
                  <defs>
                    <filter id="hd0" x="153" y="22" width="174" height="174" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="14"/><feOffset dy="7"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0"/><feBlend in="SourceGraphic"/></filter>
                    <filter id="hd1" x="0" y="22" width="174" height="174" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="14"/><feOffset dy="7"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0"/><feBlend in="SourceGraphic"/></filter>
                    <filter id="hd2" x="28" y="-53" width="269" height="269" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="14"/><feOffset dy="7"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.12 0"/><feBlend in="SourceGraphic"/></filter>
                  </defs>
                </svg>
              </div>
              <h3>{L.hiw1H3}</h3>
              <p>{L.hiw1P}</p>
            </article>
            <div className="hiw-arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m13 5 7 7-7 7"/></svg>
            </div>
            <article className="hiw-step">
              <div className="hiw-illu" aria-hidden="true">
                <img src={hiwStep2Mockup} alt="" loading="lazy" width={512} height={512} style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
              <h3>{L.hiw2H3}</h3>
              <p>{L.hiw2P}</p>
            </article>
            <div className="hiw-arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m13 5 7 7-7 7"/></svg>
            </div>
            <article className="hiw-step">
              <div className="hiw-illu" aria-hidden="true">
                <img src={hiwStep3Tourist} alt="" loading="lazy" width={512} height={512} style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
              <h3>{L.hiw3H3}</h3>
              <p>{L.hiw3P}</p>
            </article>
          </div>

          <div className="hiw-cta">
            <Link className="btn-primary" to="/devenir-affilie">{L.hiwBtn}</Link>
          </div>
        </div>
      </section>

      <section id="join">
        <div className="wrap">
          <div className="section-head">
            <h1 className="subtitle">{L.joinSubtitle}</h1>
            <p className="lead">{L.joinLead}</p>
          </div>

          <div className="steps">
            <article className="step">
              <span className="num">1</span>
              <div className="ico">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M6 21.5C6 19.0147 8.01472 17 10.5 17C12.9853 17 15 19.0147 15 21.5C15 23.9853 12.9853 26 10.5 26C8.01472 26 6 23.9853 6 21.5ZM10.5 20C9.67 20 9 20.67 9 21.5C9 22.33 9.67 23 10.5 23C11.33 23 12 22.33 12 21.5C12 20.67 11.33 20 10.5 20ZM10.5 28C8.01 28 6 30.01 6 32.5C6 34.99 8.01 37 10.5 37C12.99 37 15 34.99 15 32.5C15 30.01 12.99 28 10.5 28ZM9 32.5C9 31.67 9.67 31 10.5 31C11.33 31 12 31.67 12 32.5C12 33.33 11.33 34 10.5 34C9.67 34 9 33.33 9 32.5ZM18 21.5C18 20.67 18.67 20 19.5 20H28.5C29.33 20 30 20.67 30 21.5C30 22.33 29.33 23 28.5 23H19.5C18.67 23 18 22.33 18 21.5ZM19.5 31C18.67 31 18 31.67 18 32.5C18 33.33 18.67 34 19.5 34H28.5C29.33 34 30 33.33 30 32.5C30 31.67 29.33 31 28.5 31H19.5ZM6 13.5C6 12.67 6.67 12 7.5 12H28.5C29.33 12 30 12.67 30 13.5C30 14.33 29.33 15 28.5 15H7.5C6.67 15 6 14.33 6 13.5ZM6.5 6C2.91 6 0 8.91 0 12.5V35.5C0 39.09 2.91 42 6.5 42H29.5C33.09 42 36 39.09 36 35.5V12.5C36 8.91 33.09 6 29.5 6H6.5ZM3 12.5C3 10.57 4.57 9 6.5 9H29.5C31.43 9 33 10.57 33 12.5V35.5C33 37.43 31.43 39 29.5 39H6.5C4.57 39 3 37.43 3 35.5V12.5Z" fill="#ff6b35"/></svg>
              </div>
              <p className="step-label">{L.step1Label}</p>
              <h3>{L.step1H3}</h3>
              <p>{L.step1P}</p>
            </article>

            <article className="step">
              <span className="num">2</span>
              <div className="ico">
                <svg width="40" height="44" viewBox="0 0 35 40" fill="none"><path d="M27.5.5h-20C2.66.5 0 3.16 0 8v25.24c0 1.33.74 2.53 1.94 3.13 1.19.6 2.59.47 3.66-.33l2.72-2.04c.59-.44 1.43-.38 1.96.14l4.04 4.04c.88.88 2.03 1.32 3.18 1.32s2.3-.44 3.18-1.32l4.04-4.04c.53-.52 1.37-.58 1.96-.14l2.72 2.04c1.07.8 2.47.93 3.66.33C34.26 35.77 35 34.57 35 33.24V8c0-4.84-2.66-7.5-7.5-7.5zM32 33.24c0 .27-.17.4-.28.45-.1.05-.31.12-.52-.05l-2.72-2.04c-1.77-1.33-4.31-1.15-5.88.42L18.56 36.06c-.57.57-1.56.57-2.13 0L12.4 32.02C11.53 31.15 10.37 30.71 9.21 30.71c-.95 0-1.9.29-2.7.89l-2.72 2.04c-.21.16-.42.1-.52.05-.1-.05-.28-.18-.28-.45V8c0-3.15 1.35-4.5 4.5-4.5h20c3.15 0 4.5 1.35 4.5 4.5v25.24zM23.56 14.06l-10 10c-.29.29-.67.44-1.06.44s-.77-.15-1.06-.44c-.59-.59-.59-1.54 0-2.12l10-10c.59-.59 1.54-.59 2.12 0 .58.58.58 1.54 0 2.12zM10.53 13c0-1.1.88-2 1.99-2h.02c1.1 0 2 .9 2 2s-.9 2-2 2-1.99-.9-1.99-2zM24.54 23c0 1.1-.9 2-2 2s-1.99-.9-1.99-2c0-1.1.88-2 1.99-2h.02c1.1 0 1.99.9 1.99 2z" fill="#ffc008"/></svg>
              </div>
              <p className="step-label">{L.step2Label}</p>
              <h3>{L.step2H3}</h3>
              <p>{L.step2P}</p>
            </article>

            <article className="step">
              <span className="num">3</span>
              <div className="ico">
                <svg width="48" height="48" viewBox="0 0 49 48" fill="none"><path d="M26.5 20c1.93 0 3.5 1.57 3.5 3.5v9.5c0 4.97-4.03 9-9 9s-9-4.03-9-9V23.5c0-1.93 1.57-3.5 3.5-3.5h11zm0 3h-11c-.28 0-.5.22-.5.5v9.5c0 3.31 2.69 6 6 6s6-2.69 6-6V23.5c0-.28-.22-.5-.5-.5zM4.5 20l6.76-.002C10.58 20.83 10.13 21.86 10.03 23H4.5c-.28 0-.5.22-.5.5V30c0 2.76 2.24 5 5 5 .4 0 .79-.05 1.16-.14.17 1.01.48 1.97.91 2.87C10.41 37.91 9.72 38 9 38c-4.42 0-8-3.58-8-8v-6.5C1 21.57 2.57 20 4.5 20zm26.25-.002L37.5 20c1.93 0 3.5 1.57 3.5 3.5V30c0 4.42-3.58 8-8 8-.71 0-1.4-.09-2.06-.27.43-.9.74-1.86.91-2.87.37.09.76.14 1.16.14 2.76 0 5-2.24 5-5v-6.5c0-.28-.22-.5-.5-.5l-5.51.001c-.1-1.14-.55-2.17-1.24-3zM21 6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6 2.69-6 6-6zM34 8c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5 2.24-5 5-5zM8 8c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5 2.24-5 5-5zM21 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="#00a896"/></svg>
              </div>
              <p className="step-label">{L.step3Label}</p>
              <h3>{L.step3H3}</h3>
              <p>{L.step3P}</p>
            </article>
          </div>

          <div className="cta-row">
            <Link className="btn-primary" to="/devenir-affilie">{L.joinBtn}</Link>
          </div>
        </div>
      </section>

      <section id="why-us">
        <div className="wrap">
          <div className="why-head">
            <h2>{L.whyH2}</h2>
            <p>{L.whyP}</p>
          </div>

          <div className="why-wrap">
            <table className="cmp">
              <thead>
                <tr>
                  <th>{L.cmpThFeature}</th>
                  <th className="us"><span className="reco">{L.cmpReco}</span>One World Morocco</th>
                  <th>Booking.com<br/>TripAdvisor</th>
                  <th>GetYourGuide<br/>Viator</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>{L.cmpRow1Feature}</td><td className="us">{L.cmpUs0}</td><td>15–25 %</td><td>20–30 %</td></tr>
                <tr><td>{L.cmpRow2Feature}</td><td className="us">{L.cmpUsIncluded}</td><td className="x">{L.cmpNo}</td><td className="x">{L.cmpNo}</td></tr>
                <tr><td>{L.cmpRow3Feature}</td><td className="us">{L.cmpUsIncluded}</td><td className="x">{L.cmpNo}</td><td className="x">{L.cmpNo}</td></tr>
                <tr><td>{L.cmpRow4Feature}</td><td className="us">{L.cmpUsYes}</td><td>{L.cmpNo}</td><td>{L.cmpNo}</td></tr>
                <tr><td>{L.cmpRow5Feature}</td><td className="us">{L.cmpUsYes}</td><td className="x">{L.cmpNo}</td><td className="x">{L.cmpNo}</td></tr>
                <tr><td>{L.cmpRow6Feature}</td><td className="us">{L.cmpUsFree}</td><td className="x">{L.cmpNo}</td><td className="x">{L.cmpNo}</td></tr>
                <tr><td>{L.cmpRow7Feature}</td><td className="us">{L.cmpUsOptional}</td><td>{L.cmpNo}</td><td>{L.cmpNo}</td></tr>
                <tr><td>{L.cmpRow8Feature}</td><td className="us">{L.cmpUsIncluded}</td><td className="x">{L.cmpNo}</td><td className="x">{L.cmpNo}</td></tr>
                <tr><td>{L.cmpRow9Feature}</td><td className="us">{L.cmpUsIncluded}</td><td className="x">{L.cmpNo}</td><td className="x">{L.cmpNo}</td></tr>
                <tr><td>{L.cmpRow10Feature}</td><td className="us">{L.cmpRow10Us}</td><td>{L.cmpRow10Booking}</td><td>{L.cmpRow10Gyg}</td></tr>
                <tr><td>{L.cmpRow11Feature}</td><td className="us">{L.cmpUsYes}</td><td className="x">{L.cmpNo}</td><td className="x">{L.cmpNo}</td></tr>
                <tr><td>{L.cmpRow12Feature}</td><td className="us">{L.cmpUsYes}</td><td className="x">{L.cmpNo}</td><td className="x">{L.cmpNo}</td></tr>
                <tr><td>{L.cmpRow13Feature}</td><td className="us">{L.cmpUsYes}</td><td>{L.cmpNo}</td><td>{L.cmpNo}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="why-cta">
            <Link className="btn-primary" to="/devenir-affilie">{L.whyBtn}</Link>
          </div>
        </div>
      </section>




      </div>
      <Footer variant="verified" />
    </>
  );
};

export default Join;
