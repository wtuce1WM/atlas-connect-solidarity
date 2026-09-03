import { useEffect, useRef, useState } from "react";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import FrontHeader from "@/components/front/FrontHeader";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import portraitVideoAsset from "@/assets/hero-home-portrait-20260830.mp4.asset.json";
import landscapeVideoAsset from "@/assets/hero-home-landscape-20260830.mp4.asset.json";
import portraitVideoPoster from "@/assets/hero-home-portrait-poster-20260830.jpg.asset.json";
import landscapeVideoPoster from "@/assets/hero-home-landscape-poster-20260830.jpg.asset.json";

const MONT = { fontFamily: "'Montserrat', sans-serif" } as const;
const glass =
  "rounded-3xl border border-white/12 bg-black/40 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.45)]";
const fieldClass =
  "w-full rounded-xl border border-white/15 bg-black/40 px-4 py-2.5 font-roboto text-[15px] text-[#F4ECDF] placeholder:text-white/35 focus:border-[#C6A046]/70 focus:outline-none focus:ring-2 focus:ring-[#C6A046]/30";

/**
 * Page Contact alignée sur l'identité de la Home `/front` :
 * un seul écran immersif (vidéo de fond + carte "glass"), pas de second écran.
 */
const Contact = () => {
  const { t } = useLanguage();
  const navigate = useLocalizedNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isPortrait, setIsPortrait] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-aspect-ratio: 1/1)").matches,
  );

  useSEO({
    title: "Contact",
    description:
      "Contactez ONE WORLD MOROCCO pour toute question sur nos services, adresses ou partenariats au Maroc.",
    canonical: "/contact",
  });

  useEffect(() => {
    const mq = window.matchMedia("(max-aspect-ratio: 1/1)");
    const on = () => setIsPortrait(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Safari iOS peut différer l'autoplay malgré muted + playsInline.
  useEffect(() => {
    const retry = () => {
      const v = bgVideoRef.current;
      if (v?.paused) void v.play().catch(() => undefined);
    };
    retry();
    document.addEventListener("touchstart", retry, { passive: true, once: true });
    document.addEventListener("click", retry, { once: true });
    return () => {
      document.removeEventListener("touchstart", retry);
      document.removeEventListener("click", retry);
    };
  }, [isPortrait]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }
    setSending(true);
    try {
      const idempotencyKey = `contact-${Date.now()}-${crypto.randomUUID()}`;
      const { error } = await supabase.functions.invoke("send-contact-message", {
        body: {
          idempotencyKey,
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        },
      });
      if (error) throw error;
      toast.success("Votre message a bien été envoyé !");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      console.error("Contact form error:", err);
      toast.error("Erreur lors de l'envoi du message. Veuillez réessayer.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <FrontHeader fixed visible onLogoClick={() => navigate("/")} />
      <section className="relative min-h-[100dvh] w-full overflow-hidden bg-[hsl(0_0%_4%)]">
        <video
          ref={bgVideoRef}
          key={isPortrait ? "portrait" : "landscape"}
          className="fixed inset-0 h-full w-full object-cover"
          src={isPortrait ? portraitVideoAsset.url : landscapeVideoAsset.url}
          poster={isPortrait ? portraitVideoPoster.url : landscapeVideoPoster.url}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <div
          className="fixed inset-0"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(to bottom, rgba(6,5,4,.7) 0%, rgba(6,5,4,.58) 35%, rgba(6,5,4,.8) 75%, rgba(6,5,4,.94) 100%)",
          }}
        />

        <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col justify-center px-5 pb-16 pt-28 md:px-10 md:pt-32">
          <h1
            className="max-w-3xl text-[28px] leading-[1.15] text-[#F4ECDF] sm:text-[2.2rem] md:text-[2.9rem]"
            style={{ ...MONT, fontWeight: 500 }}
          >
            Parlons de votre <span className="font-bold text-[#C6A046]">projet</span>
          </h1>
          <p className="mt-4 max-w-2xl font-roboto text-[15px] leading-relaxed text-white md:text-[1.0625rem]">
            Une question sur la plateforme, une adresse à référencer, une intégration sur mesure ou un
            partenariat : écrivez-nous, nous répondons rapidement.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {/* Coordonnées */}
            <div className={`${glass} p-6 md:p-8`}>
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-[#C6A046]/15 p-3">
                    <MapPin className="h-6 w-6 text-[#E4C877]" />
                  </div>
                  <div>
                    <h2 className="font-roboto text-[15px] font-bold text-[#F4ECDF]">Adresse</h2>
                    <p className="font-roboto text-[15px] text-white/75">{t("footer.location")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-[#C6A046]/15 p-3">
                    <Phone className="h-6 w-6 text-[#E4C877]" />
                  </div>
                  <div>
                    <h2 className="font-roboto text-[15px] font-bold text-[#F4ECDF]">Téléphone</h2>
                    <a href="tel:+212661439221" className="font-roboto text-[15px] text-white/75 hover:text-[#E4C877]">
                      +212 661-439221
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-[#C6A046]/15 p-3">
                    <Mail className="h-6 w-6 text-[#E4C877]" />
                  </div>
                  <div>
                    <h2 className="font-roboto text-[15px] font-bold text-[#F4ECDF]">Email</h2>
                    <a
                      href="mailto:info@oneworldmorocco.com"
                      className="font-roboto text-[15px] text-white/75 hover:text-[#E4C877]"
                    >
                      info@oneworldmorocco.com
                    </a>
                  </div>
                </div>
              </div>

              <a
                href="https://wa.me/212661439221"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 flex items-center justify-center gap-3 rounded-full bg-[#25D366] px-8 py-4 text-[12.5px] font-bold uppercase tracking-[0.16em] text-[#10361f] shadow-lg transition-transform hover:-translate-y-0.5"
                style={MONT}
              >
                <MessageCircle className="h-5 w-5" />
                WhatsApp
              </a>
            </div>

            {/* Formulaire */}
            <div className={`${glass} p-6 md:p-8`}>
              <h2
                className="text-[18px] text-[#F4ECDF] md:text-[20px]"
                style={{ ...MONT, fontWeight: 600 }}
              >
                Envoyez-nous un message
              </h2>
              <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-1 block font-roboto text-[13px] font-bold uppercase tracking-[0.12em] text-white/70">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={100}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-roboto text-[13px] font-bold uppercase tracking-[0.12em] text-white/70">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={255}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-roboto text-[13px] font-bold uppercase tracking-[0.12em] text-white/70">
                    Message
                  </label>
                  <textarea
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    maxLength={2000}
                    className={`${fieldClass} resize-none`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full rounded-full bg-[#C04F17] px-8 py-4 text-[12.5px] font-bold uppercase tracking-[0.16em] text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                  style={MONT}
                >
                  {sending ? "Envoi en cours..." : "Envoyer"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Contact;
