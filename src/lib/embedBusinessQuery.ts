// Résolution d'établissement pour les widgets publics /embed/*.
//
// Ces pages tournent dans des iframes. Sur la surface de preview, le stockage
// de session brokeré (previewAuthStorage.ts) est hors de portée dans une
// iframe imbriquée : l'iframe peut alors partir avec une session périmée, et
// la requête `businesses` échoue (401 JWT expiré…) → `maybeSingle()` renvoie
// data:null → faux « Établissement introuvable ».
//
// La table businesses est lisible publiquement (RLS), donc en cas d'ERREUR ou
// de résultat vide, on confirme avec un client purement anonyme, sans session.
// Un vrai « introuvable » reste vide lors de cette seconde lecture.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

let anonClient: SupabaseClient | null = null;

export const getEmbedAnonClient = (): SupabaseClient => {
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
 * renvoie une erreur ou aucun résultat (session invalide / initialisation du
 * stockage brokeré dans l'iframe), confirme une fois avec le client anonyme.
 */
export async function embedBusinessQuery<T>(
  label: string,
  run: (client: SupabaseClient) => PromiseLike<QueryResult<T>>
): Promise<T | null> {
  const first = (await run(supabase as unknown as SupabaseClient)) as QueryResult<T>;
  if (!first.error && first.data != null) return first.data;
  console.warn(
    `[embedBusinessQuery] ${label}: première requête ${first.error ? "en erreur" : "vide"}, confirmation anonyme`,
    first.error || undefined,
  );
  try {
    const second = (await run(getEmbedAnonClient())) as QueryResult<T>;
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
