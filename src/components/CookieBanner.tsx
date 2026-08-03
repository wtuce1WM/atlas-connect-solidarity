import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStoredConsent, setConsent } from "@/lib/analytics";

/**
 * Bannière cookies RGPD — Consent Mode v2.
 * Par défaut (index.html) : analytics_storage = denied.
 * Le choix de l'utilisateur est persisté dans localStorage('cookie-consent-v1').
 */
const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  // Neutralisée dans les routes /embed/ (l'iframe est hébergée par le partenaire,
  // qui gère son propre consentement cookies).
  // Neutralisée aussi en mode capture (?bare=1) pour ne pas polluer le screenshot
  // de la fiche utilisé dans la scène "ID numérique" du Studio Vidéo.
  const isEmbed =
    typeof window !== "undefined" &&
    (window.location.pathname.startsWith("/embed/") ||
      new URLSearchParams(window.location.search).get("bare") === "1" ||
      new URLSearchParams(window.location.search).get("embed") === "1");

  useEffect(() => {
    if (isEmbed) return;
    // Affichage différé pour ne pas concurrencer le LCP du hero
    const id = window.setTimeout(() => {
      if (!getStoredConsent()) setVisible(true);
    }, 1200);
    return () => window.clearTimeout(id);
  }, [isEmbed]);

  if (isEmbed || !visible) return null;

  const decide = (choice: "granted" | "denied") => {
    setConsent(choice);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Bannière de consentement aux cookies"
      className="fixed inset-x-0 bottom-0 z-[400] px-3 pb-3 sm:px-4 sm:pb-4"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto max-w-3xl rounded-2xl bg-[#3B3B3B] text-white shadow-2xl ring-1 ring-black/20 backdrop-blur p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
          <p className="text-sm leading-relaxed" style={{ fontFamily: "Avenir, 'Nunito Sans', system-ui, sans-serif" }}>
            Nous utilisons des cookies de mesure d’audience (Google Analytics) pour
            comprendre comment vous utilisez One World Morocco et améliorer le
            service. Aucune publicité, aucun partage commercial.{" "}
            <Link to="/cookies" className="underline underline-offset-2 hover:text-white/80">
              En savoir plus
            </Link>
          </p>
          <div className="flex shrink-0 gap-2 sm:flex-col sm:gap-2">
            <button
              type="button"
              onClick={() => decide("granted")}
              className="flex-1 rounded-full bg-[#C04F17] px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 sm:flex-none"
            >
              Accepter
            </button>
            <button
              type="button"
              onClick={() => decide("denied")}
              className="flex-1 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 sm:flex-none"
            >
              Refuser
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
