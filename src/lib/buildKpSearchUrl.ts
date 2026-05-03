import { supabase } from "@/integrations/supabase/client";

/**
 * Build a /search URL that opens a business slide-panel and pins
 * the business + its KP siblings (same logic as /fiche/:slug).
 */
export async function buildKpSearchUrl(businessId: string): Promise<string> {
  const { data } = await supabase
    .from("businesses")
    .select("id, name, city, kp_regroupement, kp_regroupement_2, kp_active")
    .eq("id", businessId)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return `/search?openBusiness=${businessId}`;

  const ids: string[] = [data.id];
  if (data.kp_active) {
    const kp1 = data.kp_regroupement?.trim();
    const kp2 = data.kp_regroupement_2?.trim();
    const orParts: string[] = [];
    if (kp1) orParts.push(`kp_regroupement.eq.${kp1}`);
    if (kp2) orParts.push(`kp_regroupement_2.eq.${kp2}`);
    if (orParts.length > 0) {
      const { data: siblings } = await supabase
        .from("businesses")
        .select("id")
        .eq("is_active", true)
        .neq("id", data.id)
        .or(orParts.join(","));
      if (siblings) ids.push(...siblings.map((s: any) => s.id));
    }
  }

  const params = new URLSearchParams();
  params.set("openBusiness", data.id);
  params.set("pinIds", ids.join(","));
  if (data.name) params.set("q", data.name);
  if (data.city) params.set("t", data.city);
  return `/search?${params.toString()}`;
}
