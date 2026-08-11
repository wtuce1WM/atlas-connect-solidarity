// Translation dictionary for the controlled vocabulary of business "engagements"
// (standards, certifications, logistics/amenities). Keys are the raw French
// values stored in businesses.engagements — WITHOUT the "Certification:" /
// "Logistique:" prefix (already stripped upstream). Standalone entries
// (Vegan, Bio, Commerce équitable...) are also included.

type Lang = "fr" | "en" | "ar";

const MAP: Record<string, { en: string; ar: string }> = {
  // ── Standards / engagements ─────────────────────────────────────────────
  "Bio (intégral)": { en: "Organic (fully)", ar: "عضوي (كامل)" },
  "Bio (partiellement)": { en: "Organic (partly)", ar: "عضوي (جزئياً)" },
  "Commerce équitable": { en: "Fair trade", ar: "تجارة عادلة" },
  "Engagement éco-responsable": { en: "Eco-responsible", ar: "التزام بيئي" },
  "Engagement solidaire": { en: "Community engagement", ar: "التزام تضامني" },
  "Marché occasionnel": { en: "Occasional market", ar: "سوق موسمي" },
  "Marché:Samedi": { en: "Saturday market", ar: "سوق السبت" },
  "Régimes spéciaux (sans gluten, sans lactose...)": { en: "Special diets (gluten-free, lactose-free...)", ar: "أنظمة غذائية خاصة (خالٍ من الغلوتين، اللاكتوز...)" },
  "Vegan": { en: "Vegan", ar: "نباتي صرف" },

  // ── Certifications (after "Certification:" prefix stripped) ─────────────
  "1% For The Planet": { en: "1% For The Planet", ar: "1% For The Planet" },
  "100% Made in Morocco": { en: "100% Made in Morocco", ar: "صُنع في المغرب 100%" },
  "AFNOR": { en: "AFNOR", ar: "AFNOR" },
  "Agriculture Biologique": { en: "Organic Farming", ar: "زراعة عضوية" },
  "ATR (agir pour un tourisme responsable)": { en: "ATR (Responsible Tourism)", ar: "ATR (سياحة مسؤولة)" },
  "B-Corp": { en: "B-Corp", ar: "B-Corp" },
  "Certifié ISO": { en: "ISO Certified", ar: "معتمد ISO" },
  "Certifiés IKO et ISA": { en: "IKO & ISA Certified", ar: "معتمد IKO و ISA" },
  "Clef Verte": { en: "Green Key", ar: "المفتاح الأخضر" },
  "Cosmos Organic": { en: "Cosmos Organic", ar: "Cosmos Organic" },
  "Ecocert": { en: "Ecocert", ar: "Ecocert" },
  "Label RSE": { en: "CSR Label", ar: "شهادة المسؤولية الاجتماعية" },
  "Non testé sur animaux": { en: "Not tested on animals", ar: "لم يُختبر على الحيوانات" },
  "Oeko-Tex": { en: "Oeko-Tex", ar: "Oeko-Tex" },
  "Pacte National sur les Emballages Plastiques": { en: "National Plastic Packaging Pact", ar: "الميثاق الوطني للتغليف البلاستيكي" },
  "Sans parabènes": { en: "Paraben-free", ar: "خالٍ من البارابين" },
  "Union for the Ethical Biotrade": { en: "Union for Ethical BioTrade", ar: "اتحاد التجارة الحيوية الأخلاقية" },

  // ── Logistique / commodités (after "Logistique:" prefix stripped) ──────
  "Accessible aux personnes à mobilité réduite": { en: "Wheelchair accessible", ar: "متاح لذوي الإعاقة الحركية" },
  "Adultes seulement": { en: "Adults only", ar: "للبالغين فقط" },
  "Animaux de compagnie acceptés": { en: "Pets allowed", ar: "الحيوانات الأليفة مسموح بها" },
  "Annulez jusqu'à 24h avant pour un remboursement intégral": { en: "Free cancellation up to 24h before", ar: "إلغاء مجاني حتى 24 ساعة قبل الموعد" },
  "Assistance 24h/24": { en: "24/7 support", ar: "دعم 24/7" },
  "Assurance inclue": { en: "Insurance included", ar: "التأمين مشمول" },
  "Climatisation réversible": { en: "Reversible air conditioning", ar: "تكييف قابل للعكس" },
  "Cliquez et retirez": { en: "Click & collect", ar: "اطلب واستلم" },
  "Coffre-fort": { en: "Safe", ar: "خزنة" },
  "Commandez 24h à l'avance": { en: "Order 24h in advance", ar: "اطلب قبل 24 ساعة" },
  "Vente en ligne": { en: "Online store", ar: "متجر أونلاين" },
  "Devis gratuit": { en: "Free quote", ar: "عرض سعر مجاني" },
  "Disponible 24h/24": { en: "Available 24/7", ar: "متاح 24/7" },
  "Disponible en ligne et en magasin": { en: "Online & in-store", ar: "متاح أونلاين وفي المتجر" },
  "Échange & retours 365 jours": { en: "365-day returns & exchanges", ar: "إرجاع واستبدال خلال 365 يوم" },
  "Enfants de moins de 14 ans non acceptés": { en: "No children under 14", ar: "غير مسموح للأطفال دون 14 سنة" },
  "Garantie 2 ans": { en: "2-year warranty", ar: "ضمان سنتين" },
  "Interdit de fumer": { en: "No smoking", ar: "ممنوع التدخين" },
  "Livraison à domicile": { en: "Home delivery", ar: "توصيل للمنزل" },
  "Livraison dans tout le Maroc": { en: "Delivery across Morocco", ar: "توصيل لجميع أنحاء المغرب" },
  "Livraison Express": { en: "Express delivery", ar: "توصيل سريع" },
  "Livraison Glovo": { en: "Glovo delivery", ar: "توصيل عبر Glovo" },
  "Livraison internationale": { en: "International shipping", ar: "شحن دولي" },
  "Location / Vente": { en: "Rental / Sale", ar: "إيجار / بيع" },
  "Location possible": { en: "Rental available", ar: "إيجار متاح" },
  "Navette gratuite": { en: "Free shuttle", ar: "نقل مجاني" },
  "Ne sert pas d'alcool": { en: "No alcohol served", ar: "لا يُقدَّم الكحول" },
  "Non fumeur": { en: "Non-smoking", ar: "غير مدخنين" },
  "Ouvert 24h/24": { en: "Open 24/7", ar: "مفتوح 24/7" },
  "Ouvert à la clientèle externe": { en: "Open to non-guests", ar: "مفتوح للزوار الخارجيين" },
  "Paiement à la livraison": { en: "Cash on delivery", ar: "الدفع عند الاستلام" },
  "Paiement cash": { en: "Cash payment", ar: "الدفع نقداً" },
  "Paiement cash uniquement": { en: "Cash only", ar: "نقداً فقط" },
  "Paiement CB": { en: "Card payment", ar: "الدفع بالبطاقة" },
  "Parking Clients": { en: "Customer parking", ar: "موقف للعملاء" },
  "Prestation à domicile": { en: "At-home service", ar: "خدمة في المنزل" },
  "Privatisation possible": { en: "Private hire available", ar: "إمكانية الحجز الخاص" },
  "Programme de fidélité": { en: "Loyalty program", ar: "برنامج الولاء" },
  "Réservation conseillée": { en: "Reservation recommended", ar: "يُنصح بالحجز" },
  "Réservation en ligne obligatoire": { en: "Online booking required", ar: "الحجز أونلاين إلزامي" },
  "Réservation en ligne ou retrait sur place": { en: "Book online or pick up", ar: "احجز أونلاين أو استلم في المكان" },
  "Réservation obligatoire": { en: "Reservation required", ar: "الحجز إلزامي" },
  "Réservé à la clientèle de l'établissement": { en: "Guests only", ar: "لنزلاء المؤسسة فقط" },
  "Réservé aux femmes": { en: "Women only", ar: "للنساء فقط" },
  "Retours gratuits pendant 30 jours": { en: "Free returns within 30 days", ar: "إرجاع مجاني خلال 30 يوم" },
  "Sans électricité": { en: "No electricity", ar: "بدون كهرباء" },
  "Service continu": { en: "Continuous service", ar: "خدمة متواصلة" },
  "Service sur-mesure": { en: "Tailor-made service", ar: "خدمة حسب الطلب" },
  "Services à domicile": { en: "Home services", ar: "خدمات في المنزل" },
  "Sur rendez-vous": { en: "By appointment", ar: "بموعد مسبق" },
  "Tenue correcte exigée": { en: "Smart dress code", ar: "لباس لائق مطلوب" },
  "Transfert aéroport": { en: "Airport transfer", ar: "نقل من المطار" },
  "Uniquement accessible aux visiteurs du jardin": { en: "Garden visitors only", ar: "لزوار الحديقة فقط" },
  "Vente aux professionnels": { en: "Wholesale (B2B)", ar: "بيع للمحترفين" },
  "Web only": { en: "Online only", ar: "أونلاين فقط" },
  "WiFi": { en: "WiFi", ar: "واي فاي" },
};

export function translateEngagementLabel(label: string, language: Lang): string {
  if (language === "fr" || !label) return label;
  const hit = MAP[label];
  if (!hit) return label;
  return language === "en" ? hit.en : hit.ar;
}
