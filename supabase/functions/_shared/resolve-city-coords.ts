// Résolution tolérante d'un nom de ville vers ses coordonnées (FR / EN / AR / slug).
import { createClient } from "npm:@supabase/supabase-js@2";

const normalize = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, " ")
    .trim();

export async function resolveCityCoords(
  city: string,
): Promise<{ lat: number; lon: number; name: string } | null> {
  const query = (city || "").trim();
  if (!query) return null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase
    .from("cities")
    .select("name_fr, name_en, name_ar, latitude, longitude");

  if (error || !data) return null;

  const target = normalize(query);
  const candidates = data.filter((c: any) => c.latitude != null && c.longitude != null);

  const fields = (c: any) => [c.name_fr, c.name_en, c.name_ar].filter(Boolean) as string[];

  // 1. Correspondance exacte (normalisée) sur FR / EN / AR / slug
  let hit = candidates.find((c: any) => fields(c).some((v) => normalize(v) === target));

  // 2. Correspondance partielle (contient)
  if (!hit) {
    hit = candidates.find((c: any) =>
      fields(c).some((v) => {
        const n = normalize(v);
        return n.length > 2 && (n.includes(target) || target.includes(n));
      })
    );
  }

  if (!hit) return null;
  return {
    lat: Number(hit.latitude),
    lon: Number(hit.longitude),
    name: hit.name_fr || hit.name_en || query,
  };
}
