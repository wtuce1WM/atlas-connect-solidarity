import { supabase } from "@/integrations/supabase/client";

/**
 * Résolution « ID vidéo → business_id », mutualisée et mise en cache.
 *
 * Avant : le viewer lançait systématiquement 3 requêtes en parallèle
 * (business_documents / generic_video_businesses / business_youtube_videos)
 * à chaque changement de vidéo, y compris pour une vidéo déjà vue.
 *
 * Ici : le préfixe de l'ID (`gv-` / `yt-` / `self-`) identifie déjà la table,
 * donc une seule requête suffit dans la majorité des cas ; sans préfixe on
 * interroge business_documents d'abord et on ne complète qu'en cas d'absence.
 * Le résultat (y compris `null`) est mémorisé et les requêtes en vol dédupliquées.
 *
 * Source unique de cette résolution : ne pas la redupliquer ailleurs.
 */

type Kind = "doc" | "generic" | "youtube" | "unknown";

const cache = new Map<string, Promise<string | null>>();

function classify(videoId: string): { kind: Kind; rawId: string } {
  const s = String(videoId);
  if (s.startsWith("gv-")) return { kind: "generic", rawId: s.slice(3) };
  if (s.startsWith("yt-")) return { kind: "youtube", rawId: s.slice(3) };
  if (s.startsWith("self-")) return { kind: "doc", rawId: s.slice(5) };
  return { kind: "unknown", rawId: s };
}

async function queryDoc(rawId: string): Promise<string | null> {
  const { data } = await (supabase as any)
    .from("business_documents").select("business_id").eq("id", rawId).maybeSingle();
  return (data as any)?.business_id ?? null;
}

async function queryGeneric(rawId: string): Promise<string | null> {
  const { data } = await (supabase as any)
    .from("generic_video_businesses").select("business_id").eq("generic_video_id", rawId).limit(1);
  return ((data as any[]) || [])[0]?.business_id ?? null;
}

async function queryYoutube(rawId: string): Promise<string | null> {
  const { data } = await (supabase as any)
    .from("business_youtube_videos").select("business_id").eq("id", rawId).maybeSingle();
  return (data as any)?.business_id ?? null;
}

async function resolve(videoId: string): Promise<string | null> {
  const { kind, rawId } = classify(videoId);
  if (!/^[0-9a-f-]{36}$/i.test(rawId)) return null;
  try {
    if (kind === "doc") return await queryDoc(rawId);
    if (kind === "generic") return await queryGeneric(rawId);
    if (kind === "youtube") return await queryYoutube(rawId);
    // Type inconnu : une requête, puis complément seulement si nécessaire.
    const fromDoc = await queryDoc(rawId);
    if (fromDoc) return fromDoc;
    const [gen, yt] = await Promise.all([queryGeneric(rawId), queryYoutube(rawId)]);
    return gen || yt || null;
  } catch {
    return null;
  }
}

/** business_id de la vidéo (ou null), mis en cache par ID vidéo. */
export function resolveVideoBusinessId(videoId: string): Promise<string | null> {
  const key = String(videoId);
  const hit = cache.get(key);
  if (hit) return hit;
  const p = resolve(key).catch(() => {
    cache.delete(key);
    return null;
  });
  cache.set(key, p);
  return p;
}
