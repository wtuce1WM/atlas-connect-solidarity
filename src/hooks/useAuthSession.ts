import { useEffect, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Source de vérité unique pour l'authentification.
 *
 * Différence clé avec `supabase.auth.getSession()` utilisé seul :
 * getSession() ne fait que lire le localStorage — un token corrompu, révoqué
 * ou expiré côté serveur passe quand même et l'UI affiche un état "connecté"
 * fantôme. Ici on revalide systématiquement auprès du serveur avec getUser()
 * et on purge la session locale si le serveur la rejette.
 */
export type AuthSessionState = {
  session: Session | null;
  user: User | null;
  /** true tant que la première vérification serveur n'est pas terminée */
  loading: boolean;
  /** true quand le serveur a confirmé la session */
  verified: boolean;
  revalidate: () => Promise<User | null>;
};

/** Purge locale d'une session rejetée par le serveur. */
export const purgeLocalSession = async () => {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    try { await supabase.auth.signOut(); } catch { /* noop */ }
  }
};

/**
 * Revalide la session courante côté serveur.
 * Retourne l'utilisateur validé, ou null (et purge la session locale si elle
 * existait mais a été rejetée).
 */
export const verifySession = async (): Promise<{ session: Session | null; user: User | null }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { session: null, user: null };

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    // Token présent en local mais refusé par le serveur (bad_jwt, révoqué, expiré…)
    console.warn("[auth] session locale rejetée par le serveur, purge :", error?.message);
    await purgeLocalSession();
    return { session: null, user: null };
  }
  return { session, user: data.user };
};

export const useAuthSession = (): AuthSessionState => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  const revalidate = useCallback(async () => {
    const res = await verifySession();
    setSession(res.session);
    setUser(res.user);
    setVerified(!!res.user);
    setLoading(false);
    return res.user;
  }, []);

  useEffect(() => {
    let alive = true;

    // 1) État local immédiat (évite un flash de déconnexion), non vérifié.
    supabase.auth.getSession().then(({ data: { session: local } }) => {
      if (!alive) return;
      setSession(local ?? null);
      setUser(local?.user ?? null);
    });

    // 2) Vérification serveur.
    revalidate();

    // 3) Suivi des changements (login / logout / refresh de token).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (!alive) return;
      setSession(next ?? null);
      setUser(next?.user ?? null);
      setLoading(false);
      if (!next) {
        setVerified(false);
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        setVerified(true);
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [revalidate]);

  return { session, user, loading, verified, revalidate };
};

export default useAuthSession;
