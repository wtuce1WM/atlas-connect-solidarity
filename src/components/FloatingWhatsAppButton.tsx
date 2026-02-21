import { MessageCircle, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const WHATSAPP_NUMBER = "212661439221";

interface FloatingWhatsAppButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

const FloatingWhatsAppButton = ({ isOpen, onToggle }: FloatingWhatsAppButtonProps) => {
  const location = useLocation();
  const { language } = useLanguage();

  const hiddenPaths = ["/staff/login", "/staff/backoffice", "/affiliates", "/affiliates/dashboard"];
  if (hiddenPaths.includes(location.pathname)) return null;

  const isHome = location.pathname === "/";

  const t = {
    fr: {
      whatsapp: "WhatsApp",
      title: "Bonjour 👋",
      subtitle: "L'équipe One World Morocco est là pour vous aider, contactez-nous sur WhatsApp.",
      desc: "Une question ? Besoin d'aide pour trouver un établissement ? Écrivez-nous directement sur WhatsApp.",
      chatBtn: "Démarrer le chat",
      defaultMsg: "Bonjour, j'ai une question concernant One World Morocco.",
    },
    en: {
      whatsapp: "WhatsApp",
      title: "Hello 👋",
      subtitle: "The One World Morocco team is here to help, contact us on WhatsApp.",
      desc: "Have a question? Need help finding a place? Write to us directly on WhatsApp.",
      chatBtn: "Start chat",
      defaultMsg: "Hello, I have a question about One World Morocco.",
    },
    ar: {
      whatsapp: "واتساب",
      title: "مرحباً 👋",
      subtitle: "فريق One World Morocco هنا لمساعدتك، تواصل معنا عبر واتساب.",
      desc: "لديك سؤال؟ تحتاج مساعدة للعثور على مؤسسة؟ راسلنا مباشرة على واتساب.",
      chatBtn: "بدء المحادثة",
      defaultMsg: "مرحباً، لدي سؤال حول One World Morocco.",
    },
  }[language] || {
    whatsapp: "WhatsApp",
    title: "Bonjour 👋",
    subtitle: "L'équipe One World Morocco est là pour vous aider, contactez-nous sur WhatsApp.",
    desc: "Une question ? Besoin d'aide pour trouver un établissement ? Écrivez-nous directement sur WhatsApp.",
    chatBtn: "Démarrer le chat",
    defaultMsg: "Bonjour, j'ai une question concernant One World Morocco.",
  };

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t.defaultMsg)}`;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={onToggle}
        style={{ backgroundColor: "#25D366" }}
        className={`fixed ${isHome ? "bottom-6" : "bottom-[76px] md:bottom-6"} right-4 md:right-6 ${isOpen ? "z-[60]" : "z-50"} flex items-center gap-2 rounded-full px-4 md:px-5 py-2.5 md:py-3 text-white shadow-lg transition-all duration-300 hover:opacity-90 hover:shadow-xl hover:scale-105 active:scale-95`}
        aria-label={t.whatsapp}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <>
            <MessageCircle className="h-5 w-5" />
            <span className="font-semibold text-sm hidden lg:inline">{t.whatsapp}</span>
          </>
        )}
      </button>

      {/* Panel overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onToggle} />
      )}

      {/* Slide-up panel */}
      <div
        className={`fixed bottom-0 right-0 z-50 w-full max-w-md transition-transform duration-300 ease-out pointer-events-none ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-4 mb-20 rounded-2xl overflow-hidden shadow-2xl pointer-events-auto">
          {/* Header */}
          <div style={{ backgroundColor: "#25D366" }} className="p-6 text-white relative">
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="h-5 w-5 pointer-events-none" />
            </button>
            <h2 className="text-2xl font-bold !font-sans !not-italic">{t.title}</h2>
            <p className="text-sm mt-2 opacity-90 leading-relaxed">{t.subtitle}</p>
          </div>

          {/* Body */}
          <div className="bg-card p-6 text-center">
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">{t.desc}</p>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onToggle}
              style={{ backgroundColor: "#25D366" }}
              className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-white font-semibold text-sm hover:opacity-90 transition-colors shadow-md"
            >
              <MessageCircle className="h-4 w-4" />
              {t.chatBtn}
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default FloatingWhatsAppButton;
