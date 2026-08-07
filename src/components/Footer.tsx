import { useEffect, useState } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { withLangPrefix } from "@/lib/localizedPath";
import { supabase } from "@/integrations/supabase/client";
import logoGold from "@/assets/logoGOLDsimpleSML.webp";

interface FooterProps {
  variant?: "default" | "morocco" | "verified" | "affiliate";
  className?: string;
}

const SOCIAL_ORDER = [
  "social_whatsapp",
  "social_tiktok",
  "social_instagram",
  "social_facebook",
  "social_twitter",
  "social_pinterest",
  "social_soundcloud",
  "social_youtube",
];

const SOCIAL_ICONS: Record<string, (cls: string) => JSX.Element> = {
  social_whatsapp: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
  ),
  social_tiktok: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.16z"/></svg>
  ),
  social_instagram: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
  ),
  social_facebook: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
  ),
  social_twitter: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  ),
  social_pinterest: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/></svg>
  ),
  social_soundcloud: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.057-.049-.1-.1-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.172 1.282c.013.06.045.094.104.094.057 0 .089-.035.104-.094l.21-1.282-.21-1.332c-.015-.057-.047-.094-.104-.094m1.79-1.065c-.067 0-.12.054-.127.113l-.215 2.378.215 2.283c.007.06.06.111.127.111.064 0 .12-.051.127-.111l.24-2.283-.24-2.378c-.007-.06-.063-.113-.127-.113m.899-.392c-.078 0-.14.063-.148.133l-.2 2.77.2 2.613c.007.07.07.127.148.127.075 0 .14-.057.148-.127l.225-2.613-.225-2.77c-.008-.07-.073-.133-.148-.133m.899-.275c-.09 0-.158.072-.166.152l-.182 3.197.182 2.923c.008.082.076.148.166.148.088 0 .158-.066.164-.148l.207-2.923-.207-3.197c-.006-.08-.076-.152-.164-.152m.901-.14c-.098 0-.18.081-.184.171l-.17 3.477.17 3.143c.004.09.086.164.184.164.096 0 .176-.074.184-.164l.19-3.143-.19-3.477c-.008-.09-.088-.171-.184-.171m.899.016c-.108 0-.195.09-.199.191l-.155 3.601.155 3.338c.004.101.091.185.199.185.109 0 .194-.084.2-.185l.176-3.338-.176-3.601c-.006-.101-.091-.191-.2-.191m.9-.154c-.12 0-.212.1-.217.21l-.142 3.946.142 3.468c.005.112.097.203.217.203.118 0 .212-.09.217-.203l.16-3.468-.16-3.946c-.005-.11-.099-.21-.217-.21m1.263-.61c-.04-.008-.082-.008-.122 0-.132 0-.235.108-.239.228l-.127 4.4.127 3.558c.004.118.107.221.239.221.13 0 .232-.103.238-.221l.143-3.558-.143-4.4c-.006-.12-.108-.228-.238-.228m.893-.028c-.145 0-.263.117-.268.249l-.12 4.579.12 3.611c.005.13.123.242.268.242.143 0 .26-.112.268-.242l.136-3.611-.136-4.579c-.008-.132-.125-.249-.268-.249m.9.183c-.156 0-.283.127-.287.268l-.104 4.546.104 3.611c.004.14.131.261.287.261s.28-.121.287-.261l.117-3.611-.117-4.546c-.007-.141-.131-.268-.287-.268m.899-.181c-.166 0-.3.137-.305.287l-.09 4.776.09 3.611c.005.15.139.275.305.275.164 0 .298-.125.305-.275l.103-3.611-.103-4.776c-.007-.15-.141-.287-.305-.287m2.707-.825c-.16 0-.307.058-.427.152a4.452 4.452 0 00-4.09-2.685c-.355 0-.703.058-1.03.153-.122.042-.155.085-.155.17v8.93c.003.09.074.163.164.171h5.538a2.31 2.31 0 002.325-2.31 2.31 2.31 0 00-2.325-2.581"/></svg>
  ),
  social_youtube: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
  ),
};

const HOVER_COLORS: Record<string, string> = {
  social_whatsapp: "hover:text-[#25D366]",
  social_tiktok: "hover:text-foreground",
  social_instagram: "hover:text-[#E4405F]",
  social_facebook: "hover:text-[#1877F2]",
  social_twitter: "hover:text-foreground",
  social_pinterest: "hover:text-[#E60023]",
  social_soundcloud: "hover:text-[#FF5500]",
  social_youtube: "hover:text-[#FF0000]",
};

const SOCIAL_TITLES: Record<string, string> = {
  social_whatsapp: "WhatsApp",
  social_tiktok: "TikTok",
  social_instagram: "Instagram",
  social_facebook: "Facebook",
  social_twitter: "X (Twitter)",
  social_pinterest: "Pinterest",
  social_soundcloud: "SoundCloud",
  social_youtube: "YouTube",
};

const Footer = ({ variant = "default", className }: FooterProps) => {
  const { t, language } = useLanguage();
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchSocialLinks = async () => {
      const { data } = await (supabase
        .from("site_settings" as any)
        .select("key, value")
        .like("key", "social_%") as any);
      if (data) {
        const map: Record<string, string> = {};
        (data as { key: string; value: string }[]).forEach((row) => {
          if (row.value) map[row.key] = row.value;
        });
        setSocialLinks(map);
      }
    };
    fetchSocialLinks();
  }, []);

  const isVerified = variant === "verified";
  const isAffiliate = variant === "affiliate";

  const footerBg = className
    ? className
    : variant === "morocco"
    ? "bg-transparent text-white"
    : isAffiliate
    ? "bg-transparent text-white"
    : "bg-background text-foreground";

  const textSecondary = isAffiliate
    ? "text-white/90"
    : isVerified || variant !== "morocco"
    ? "text-foreground/80"
    : "text-white/90";
  const textTertiary = isAffiliate
    ? "text-white/80"
    : isVerified || variant !== "morocco"
    ? "text-foreground/70"
    : "text-white/70";
  const textQuaternary = isAffiliate
    ? "text-white/70"
    : isVerified || variant !== "morocco"
    ? "text-foreground/60"
    : "text-white/60";
  const borderColor = isAffiliate
    ? "border-white/20"
    : isVerified || variant !== "morocco"
    ? "border-foreground/20"
    : "border-white/20";
  const headingColor = isAffiliate ? "text-white" : "text-[#3B3B3B]";
  const brandColor = isAffiliate ? "text-white" : "text-black";

  return (
    <footer className={footerBg}>
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2 text-center md:text-left flex flex-col items-center md:items-start">
            <div className="mb-4 flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: "0.12em", textTransform: "uppercase" }}>
               <span className={brandColor}>ONE WORLD</span> <span className={brandColor}>MOROCCO</span>
             </span>
            </div>
            <p className={`mb-6 text-sm leading-relaxed ${textSecondary}`}>
              {language === "en"
                ? "Make every purchase a generous act. We are the only platform where commitment is written into our DNA: 20% of every advertiser membership fee goes directly to humanitarian and solidarity actions. You spend, we act — together."
                : language === "ar"
                ? "اجعل من كل عملية شراء عملاً من أعمال السخاء. نحن المنصة الوحيدة التي يكون فيها الالتزام جزءًا من حمضنا النووي: 20٪ من كل اشتراك للمعلنين تذهب مباشرة إلى الأعمال الإنسانية والتضامنية. أنتم تستهلكون، ونحن نتحرك معًا."
                : "Faites de chaque achat un acte de générosité. Nous sommes la seule plateforme où l'engagement est inscrit dans notre ADN : 20% du montant de chaque cotisation des annonceurs est directement reversé à des actions humanitaires et de solidarité. Vous consommez, nous agissons ensemble."}
            </p>
            <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start">
              {SOCIAL_ORDER.map((key) => {
                const url = socialLinks[key];
                if (!url) return null;
                const iconFn = SOCIAL_ICONS[key];
                if (!iconFn) return null;
                return (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${textTertiary} transition-colors ${HOVER_COLORS[key] || ""}`}
                    title={SOCIAL_TITLES[key]}
                  >
                    {iconFn("h-5 w-5")}
                  </a>
                );
              })}
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className={`mb-4 font-semibold ${headingColor}`}>{language === "en" ? "Links" : language === "ar" ? "روابط" : "Liens"}</h4>
            <ul className={`space-y-2 ${textSecondary}`}>
              <li><Link to="/conditions-generales" className="transition-colors hover:text-terracotta">{language === "en" ? "General Terms of Operation" : language === "ar" ? "الشروط العامة للتشغيل" : "Conditions Générales de Fonctionnement"}</Link></li>
              <li><Link to="/mission" className="transition-colors hover:text-terracotta">{t("footer.ourMission")}</Link></li>
              <li><a href="/affiliates" className="transition-colors hover:text-terracotta">{t("footer.affiliates")}</a></li>

              <li><a href="/staff/login" className="transition-colors hover:text-terracotta">{t("footer.staff")}</a></li>
              <li><Link to={withLangPrefix("/blog", language)} className="transition-colors hover:text-terracotta">{t("footer.blog")}</Link></li>
              <li><Link to={withLangPrefix("/install", language)} className="transition-colors hover:text-terracotta">{language === "en" ? "App" : language === "ar" ? "التطبيق" : "Application"}</Link></li>
              <li><Link to="/devenir-affilie" className="transition-colors hover:text-terracotta">{language === "ar" ? "أدرج شركتك" : language === "en" ? "Add your business" : "Ajoutez votre entreprise"}</Link></li>
              <li><Link to="/widgets" className="transition-colors hover:text-terracotta">{language === "en" ? "Widgets" : language === "ar" ? "الأدوات" : "Widgets"}</Link></li>
              <li><Link to="/contact" className="transition-colors hover:text-terracotta">{t("footer.contact")}</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className={`mb-4 font-semibold ${headingColor}`}>Contact</h4>
            <ul className={`space-y-3 ${textSecondary}`}>
              <li className="flex items-center gap-2">
                <MapPin className={`h-4 w-4 ${headingColor}`} />
                {t("footer.location")}
              </li>
              <li className="flex items-center gap-2">
                <Phone className={`h-4 w-4 ${headingColor}`} />
                <a href="tel:+212661439221" className="hover:text-terracotta transition-colors">+212 661-439221</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className={`h-4 w-4 ${headingColor}`} />
                <a href="mailto:info@oneworldmorocco.com" className="hover:text-terracotta transition-colors">info@oneworldmorocco.com</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className={`mt-12 flex flex-col items-center justify-between gap-4 border-t ${borderColor} pt-8 md:flex-row`}>
          <p className={`text-sm ${textQuaternary}`}>
            © 2026 ZitounMusk. {t("footer.rights")}
          </p>
          <div className={`flex gap-6 text-sm ${textQuaternary}`}>
            <a href="/confidentialite" className="transition-colors hover:text-terracotta">{t("footer.privacy")}</a>
            <a href="/cgu" className="transition-colors hover:text-terracotta">{t("footer.terms")}</a>
            <a href="/cookies" className="transition-colors hover:text-terracotta">{t("footer.cookies")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
