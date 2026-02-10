import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import logoGold from "@/assets/logoGOLDsimpleSML.webp";

interface FooterProps {
  variant?: "default" | "morocco" | "verified";
}

const Footer = ({ variant = "default" }: FooterProps) => {
  const { t } = useLanguage();

  const isVerified = variant === "verified";

  const footerBg = variant === "morocco" 
    ? "bg-transparent text-white" 
    : isVerified
    ? "bg-transparent text-black"
    : "bg-black text-white";

  const textSecondary = isVerified ? "text-black/70" : "text-background/70";
  const textTertiary = isVerified ? "text-black/60" : "text-background/60";
  const textQuaternary = isVerified ? "text-black/50" : "text-background/50";
  const brandMorocco = isVerified ? "text-black" : "text-background";
  const borderColor = isVerified ? "border-black/10" : "border-background/10";

  return (
    <footer className={footerBg}>
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <img src={logoGold} alt="WTUCEMA Logo" className="h-10 w-10 object-contain" />
            <span className="text-xl font-bold tracking-tight">
              <span className="text-gold">ONE WORLD</span> <span className={brandMorocco}>MOROCCO</span>
            </span>
            </div>
            <p className={`mb-6 ${textSecondary}`}>
              {t("footer.description")}
            </p>
            <div className="flex gap-4">
              <a href="#" className={`${textTertiary} transition-colors hover:text-gold`}>
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className={`${textTertiary} transition-colors hover:text-gold`}>
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className={`${textTertiary} transition-colors hover:text-gold`}>
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="mb-4 font-semibold text-gold">{t("footer.services")}</h4>
            <ul className={`space-y-2 ${textSecondary}`}>
              <li><a href="#" className="transition-colors hover:text-gold">{t("footer.findServices")}</a></li>
              <li><a href="#" className="transition-colors hover:text-gold">{t("footer.postJob")}</a></li>
              <li><a href="#" className="transition-colors hover:text-gold">{t("footer.becomeProvider")}</a></li>
              <li><a href="#" className="transition-colors hover:text-gold">{t("footer.businessSolutions")}</a></li>
              <li><Link to="/blog" className="transition-colors hover:text-gold">{t("footer.blog")}</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-4 font-semibold text-gold">{t("footer.company")}</h4>
            <ul className={`space-y-2 ${textSecondary}`}>
              <li><a href="#" className="transition-colors hover:text-gold">{t("footer.aboutUs")}</a></li>
              <li><Link to="/mission" className="transition-colors hover:text-gold">{t("footer.ourMission")}</Link></li>
              <li><a href="/affiliates" className="transition-colors hover:text-gold">{t("footer.affiliates")}</a></li>
              <li><a href="#" className="transition-colors hover:text-gold">{t("footer.press")}</a></li>
              <li><a href="/staff/login" className="transition-colors hover:text-gold">{t("footer.staff")}</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 font-semibold text-gold">{t("footer.contact")}</h4>
            <ul className={`space-y-3 ${textSecondary}`}>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gold" />
                {t("footer.location")}
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gold" />
                +212 5XX-XXXXXX
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gold" />
                info@wtuce.org
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
            <a href="#" className="transition-colors hover:text-gold">{t("footer.privacy")}</a>
            <a href="#" className="transition-colors hover:text-gold">{t("footer.terms")}</a>
            <a href="#" className="transition-colors hover:text-gold">{t("footer.cookies")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;