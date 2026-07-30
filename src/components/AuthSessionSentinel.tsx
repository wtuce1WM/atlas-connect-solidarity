import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { verifySession } from "@/hooks/useAuthSession";

/**
 * Sentinelle globale d'authentification.
 *
 * Monté une seule fois dans l'app, ce composant revalide la session auprès du
 * serveur au démarrage puis à chaque retour d'onglet / réveil de la PWA.
 * Si le serveur rejette le token stocké localement (bad_jwt, session révoquée,
 * refresh token expiré), la session locale est purgée immédiatement — l'UI ne
 * peut plus rester dans un état "connecté" fantôme.
 */
const AuthSessionSentinel = () => {
  const checking = useRef(false);

  useEffect(() => {
    const check = async () => {
      if (checking.current) return;
      checking.current = true;
      try {
        await verifySession();
      } finally {
        checking.current = false;
      }
    };

    check();

    const onFocus = () => {
      if (document.visibilityState === "visible") check();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    // Revalidation périodique légère (30 min) pour les sessions laissées ouvertes.
    const interval = window.setInterval(check, 30 * 60 * 1000);

    // Si Supabase échoue à rafraîchir le token, on purge aussi.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED") check();
    });

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  return null;
};

export default AuthSessionSentinel;
