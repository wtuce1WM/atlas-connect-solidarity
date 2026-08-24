// Résolution d'établissement pour les widgets publics /embed/*.
//
// Ces pages tournent dans des iframes. Sur la surface de preview, le stockage
// de session brokeré (previewAuthStorage.ts) est hors de portée dans une
// iframe imbriquée : l'iframe peut alors partir avec une session périmée, et
// la requête `businesses` échoue (401 JWT expiré…) → `maybeSingle()` renvoie
// data:null → faux « Établissement introuvable ».
//
// La table businesses est lisible publiquement (RLS), donc en cas d'ERREUR
// (et uniquement d'erreur — un data:null sans erreur reste un vrai
// introuvable), on retente avec un client purement anonyme, sans session.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

let anonClient: SupabaseClient | null = null;

const anon = (): SupabaseClient => {
  if (!anonClient) {
    anonClient = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );
  }
  return anonClient;
};

type QueryResult<T> = { data: T | null; error: unknown };

/**
 * Exécute une requête businesses de widget avec le client courant ; si elle
 * renvoie une ERREUR (session invalide dans l'iframe, réseau…), retente une
 * fois en anonyme. Ne masque jamais un vrai « introuvable » (data:null sans
 * erreur n'est pas retenté).
 */
export async function embedBusinessQuery<T>(
  label: string,
  run: (client: SupabaseClient) => PromiseLike<QueryResult<T>>
): Promise<T | null> {
  const first = (await run(supabase as unknown as SupabaseClient)) as QueryResult<T>;
  if (!first.error) return first.data ?? null;
  console.warn(`[embedBusinessQuery] ${label}: première requête en erreur, retry anonyme`, first.error);
  try {
    const second = (await run(anon())) as QueryResult<T>;
    if (second.error) {
      console.warn(`[embedBusinessQuery] ${label}: retry anonyme en erreur`, second.error);
      return null;
    }
    return second.data ?? null;
  } catch (e) {
    console.warn(`[embedBusinessQuery] ${label}: retry anonyme a levé une exception`, e);
    return null;
  }
}
