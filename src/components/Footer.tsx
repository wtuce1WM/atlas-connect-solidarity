import { Globe, Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Globe className="h-8 w-8 text-gold" />
              <span className="font-serif text-xl font-bold">
                Solidarity<span className="text-gold">MA</span>
              </span>
            </div>
            <p className="mb-6 text-background/70">
              {t("footer.description")}
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-background/60 transition-colors hover:text-gold">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-background/60 transition-colors hover:text-gold">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-background/60 transition-colors hover:text-gold">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="mb-4 font-semibold text-gold">{t("footer.services")}</h4>
            <ul className="space-y-2 text-background/70">
              <li><a href="#" className="transition-colors hover:text-gold">{t("footer.findServices")}</a></li>
              <li><a href="#" className="transition-colors hover:text-gold">{t("footer.postJob")}</a></li>
              <li><a href="#" className="transition-colors hover:text-gold">{t("footer.becomeProvider")}</a></li>
              <li><a href="#" className="transition-colors hover:text-gold">{t("footer.businessSolutions")}</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-4 font-semibold text-gold">{t("footer.company")}</h4>
            <ul className="space-y-2 text-background/70">
              <li><a href="#" className="transition-colors hover:text-gold">{t("footer.aboutUs")}</a></li>
              <li><a href="#" className="transition-colors hover:text-gold">{t("footer.ourMission")}</a></li>
              <li><a href="#" className="transition-colors hover:text-gold">{t("footer.careers")}</a></li>
              <li><a href="#" className="transition-colors hover:text-gold">{t("footer.press")}</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 font-semibold text-gold">{t("footer.contact")}</h4>
            <ul className="space-y-3 text-background/70">
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
                contact@solidarityma.com
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-background/10 pt-8 md:flex-row">
          <p className="text-sm text-background/50">
            © 2024 SolidarityMA. {t("footer.rights")}
          </p>
          <div className="flex gap-6 text-sm text-background/50">
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
