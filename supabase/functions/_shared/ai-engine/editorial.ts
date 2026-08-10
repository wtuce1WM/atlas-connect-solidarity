// Contexte éditorial partagé pour le moteur IA A/B/C.
// Source d'autorité unique : les TXT IA (business_ai_texts).
// Les notes de connaissances (knowledge_entries) sont INTERNES (technique / staff)
// et ne doivent JAMAIS être injectées dans un prompt voyageur.

export interface EditorialText {
  business_id: string;
  title: string;
  hook: string;
  content: string;
}

interface LoadOptions {
  businessIds: string[];
  /** Nombre max de textes par établissement (défaut 2). */
  perBusiness?: number;
  /** Nombre max de textes au total (défaut 12). */
  limit?: number;
  /** Longueur max de chaque extrait (défaut 600). */
  maxChars?: number;
}

/** Charge les TXT IA actifs des établissements donnés, triés par position. */
export async function loadEditorialTexts(
  admin: any,
  { businessIds, perBusiness = 2, limit = 12, maxChars = 600 }: LoadOptions,
): Promise<EditorialText[]> {
  const ids = [...new Set((businessIds || []).filter(Boolean))];
  if (ids.length === 0) return [];
  try {
    const { data } = await admin
      .from("business_ai_texts")
      .select("business_id, title, hook, content, position")
      .in("business_id", ids)
      .eq("is_active", true)
      .order("position", { ascending: true });

    const perCount: Record<string, number> = {};
    const out: EditorialText[] = [];
    for (const row of (data || []) as any[]) {
      const content = String(row?.content || "").trim();
      if (!content) continue;
      const bid = String(row.business_id);
      perCount[bid] = (perCount[bid] || 0) + 1;
      if (perCount[bid] > perBusiness) continue;
      out.push({
        business_id: bid,
        title: String(row?.title || "").trim(),
        hook: String(row?.hook || "").trim(),
        content: content.length > maxChars ? content.slice(0, maxChars) + "…" : content,
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch (e) {
    console.error("[editorial] load_error", String(e));
    return [];
  }
}

/** Rend un bloc texte prêt à injecter dans un prompt, ou "" si rien. */
export function formatEditorialContext(
  texts: EditorialText[],
  nameById: Record<string, string> = {},
): string {
  if (!texts.length) return "";
  return texts
    .map((t) => {
      const name = nameById[t.business_id] || "";
      const head = [name, t.title].filter(Boolean).join(" — ");
      const hook = t.hook ? ` (${t.hook})` : "";
      return `[TXT IA] ${head}${hook}: ${t.content}`;
    })
    .join("\n");
}
