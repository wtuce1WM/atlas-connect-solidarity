const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from "npm:@supabase/supabase-js@2";
import { assertStaff } from "../_shared/auth-helpers.ts";

const GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL = 'openai/gpt-5.6-sol';

async function callAI(apiKey: string, messages: unknown[], jsonMode = true) {
  const res = await fetch(GATEWAY, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: 'none',
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      messages,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI ${res.status}: ${text.slice(0, 500)}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? '';
  if (!jsonMode) return content;
  try {
    return JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('Réponse IA non parsable');
  }
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await assertStaff(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const {
      prompt,
      business_id = null,
      anchor_kind = 'generic',
      template = 'article_template',
      dry_run = false,
    } = await req.json();

    if (!prompt || typeof prompt !== 'string') return json({ error: 'prompt requis' }, 400);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) return json({ error: 'LOVABLE_API_KEY manquant' }, 500);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ---------- 1. Extraction des critères ----------
    const criteria = await callAI(LOVABLE_API_KEY, [
      {
        role: 'system',
        content:
          `Tu extrais des critères de sélection d'établissements depuis une consigne éditoriale (plateforme Maroc). ` +
          `Réponds STRICTEMENT en JSON avec les clés: title (string, titre de l'article), subcategory (string|null, sous-catégorie exacte type "Restaurant", "Rooftop", "Riad", "Hôtel", "Villas"...), ` +
          `city (string|null, "Marrakech"/"Essaouira"/...), min_total_reviews (number|null), min_rating (number|null, note sur 20), ` +
          `count (number, nombre d'établissements attendus, défaut 20), min_chars (number, longueur minimale du texte par établissement, défaut 800), ` +
          `angle (string, l'angle éditorial et les points d'attention à respecter).`,
      },
      { role: 'user', content: prompt },
    ]);

    const count = Math.min(Math.max(Number(criteria.count) || 20, 1), 30);
    const minChars = Math.min(Math.max(Number(criteria.min_chars) || 800, 300), 3000);

    // ---------- 2. Sélection en base ----------
    let q = supabase
      .from('businesses')
      .select(
        'id, name, slug, city, neighborhood, categories, main_category, rating, total_review_count, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, hook_fr, description_fr, min_price, manual_price_range, ai_review_summary',
      )
      .eq('is_active', true)
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(count * 3);

    if (criteria.subcategory) q = q.contains('categories', [criteria.subcategory]);
    if (criteria.city) q = q.ilike('city', `%${criteria.city}%`);
    if (criteria.min_total_reviews) q = q.gte('total_review_count', criteria.min_total_reviews);
    if (criteria.min_rating) q = q.gte('rating', criteria.min_rating);

    const { data: rows, error: qErr } = await q;
    if (qErr) throw qErr;

    let candidates = (rows ?? []).filter((b) => {
      if (!criteria.subcategory) return true;
      // sous-catégorie par défaut = première de la liste
      return (b.categories ?? [])[0] === criteria.subcategory;
    });
    if (candidates.length < count) candidates = rows ?? [];
    candidates = candidates.slice(0, count);

    if (dry_run) {
      return json({ criteria, candidates: candidates.map((c) => ({ id: c.id, name: c.name, city: c.city, rating: c.rating, reviews: c.total_review_count })) });
    }
    if (candidates.length === 0) return json({ error: 'Aucun établissement ne correspond aux critères', criteria }, 422);

    // ---------- 3. Rédaction ----------
    const payload = candidates.map((b, i) => ({
      rank: i + 1,
      id: b.id,
      name: b.name,
      city: b.city,
      neighborhood: b.neighborhood,
      categories: b.categories,
      note_sur_20: b.rating,
      avis: b.total_review_count,
      google: [b.google_rating, b.google_review_count],
      tripadvisor: [b.tripadvisor_rating, b.tripadvisor_review_count],
      restaurant_guru: [b.restaurant_guru_rating, b.restaurant_guru_review_count],
      hook: b.hook_fr,
      description: (b.description_fr ?? '').slice(0, 1200),
      resume_avis: b.ai_review_summary,
      min_price: b.min_price,
      price_range: b.manual_price_range,
    }));

    const article = await callAI(LOVABLE_API_KEY, [
      {
        role: 'system',
        content:
          `Tu es rédacteur éditorial pour One World Morocco. Tu écris en français, immersif, précis, jamais générique, jamais promotionnel creux. ` +
          `Interdit: inventer des prix, des plats, des récompenses ou des faits absents des données. Ne parle de tarif que si min_price ou price_range existe. ` +
          `Chaque établissement doit avoir un texte d'au moins ${minChars} caractères au total (réparti en 2 à 4 paragraphes). ` +
          `Réponds STRICTEMENT en JSON: {"title":string,"slug":string,"excerpt":string,"hero_title_top":string,"hero_title_bottom":string,"hero_subtitle":string,"intro":string,"tldr":string,` +
          `"faq":[{"question":string,"answer":string}],"entries":[{"id":string,"pretitle":string,"title":string,"hook":string,"paragraphs":[string]}]}. ` +
          `"id" doit reprendre exactement l'id fourni. Garde l'ordre fourni (meilleur en premier). 4 à 6 questions de FAQ. slug en kebab-case sans accents.`,
      },
      {
        role: 'user',
        content:
          `CONSIGNE:\n${prompt}\n\nANGLE RETENU: ${criteria.angle ?? ''}\n\nÉTABLISSEMENTS (ordre = classement):\n${JSON.stringify(payload)}`,
      },
    ]);

    const entries = (article.entries ?? [])
      .filter((e: { id?: string }) => candidates.some((c) => c.id === e.id))
      .map((e: Record<string, unknown>, i: number) => ({
        id: e.id,
        pretitle: e.pretitle ?? '',
        title: e.title ?? '',
        hook: e.hook ?? '',
        paragraphs: Array.isArray(e.paragraphs) ? e.paragraphs : [String(e.paragraphs ?? '')],
        ...(i < 3 ? { rank: i + 1 } : {}),
      }));

    if (entries.length === 0) return json({ error: 'IA: aucune entrée valide générée' }, 502);

    // ---------- 4. Insertion brouillon ----------
    const baseSlug = slugify(article.slug || article.title || criteria.title || 'article');
    let slug = baseSlug;
    for (let i = 2; i < 40; i++) {
      const { data: exists } = await supabase.from('blog_posts').select('id').eq('slug', slug).maybeSingle();
      if (!exists) break;
      slug = `${baseSlug}-${i}`;
    }

    const { data: inserted, error: insErr } = await supabase
      .from('blog_posts')
      .insert({
        title_fr: article.title || criteria.title || 'Article généré',
        slug,
        excerpt_fr: article.excerpt ?? null,
        template,
        anchor_kind: business_id ? anchor_kind : 'generic',
        anchor_business_id: business_id,
        hero_title_top_fr: article.hero_title_top ?? null,
        hero_title_bottom_fr: article.hero_title_bottom ?? null,
        hero_subtitle_fr: article.hero_subtitle ?? null,
        intro_fr: article.intro ?? null,
        tldr_fr: article.tldr ?? null,
        faq_fr: Array.isArray(article.faq) ? article.faq : [],
        entries_fr: entries,
        content_fr:
          template === 'custom'
            ? [
                article.intro ? `<p>${article.intro}</p>` : '',
                ...entries.map(
                  (e: { title: string; pretitle: string; paragraphs: string[] }) =>
                    `<h2>${e.title}</h2><p><em>${e.pretitle}</em></p>` +
                    e.paragraphs.map((p) => `<p>${p}</p>`).join(''),
                ),
              ].join('\n')
            : null,
        is_published: false,
        author_name: 'One World Morocco',
      })
      .select('id, slug, title_fr')
      .single();

    if (insErr) throw insErr;

    return json({ post: inserted, criteria, entries_count: entries.length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
