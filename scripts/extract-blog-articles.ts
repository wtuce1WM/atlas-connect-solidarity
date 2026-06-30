/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Extracts blog article data from src/pages/*.tsx files that use
 * BlogArticleTemplate, producing a single JSON payload that we then
 * import into Supabase (table public.blog_posts).
 *
 * Run: bun run scripts/extract-blog-articles.ts
 */
import * as ts from "typescript";
import * as fs from "node:fs";
import * as path from "node:path";

// ---- Article inventory ---------------------------------------------------

type Article = {
  slug: string;
  file: string;
  template: "article_template" | "custom";
  sortOrder: number;
  // sometimes hero is a JSON asset import; we resolve it here.
  customHeroAssetFile?: string; // path relative to project root
  // Manual metadata for fully-custom articles that don't pass a literal
  // BlogArticleTemplate JSX (so the extractor can't find props).
  customMeta?: {
    title: string;
    description: string;
    datePublished?: string;
  };
};

const ARTICLES: Article[] = [
  {
    slug: "5-jours-marrakech-artisanat",
    file: "src/pages/MarrakechArtisanat5Jours.tsx",
    template: "custom",
    sortOrder: 100,
    customMeta: {
      title: "5 jours à Marrakech : itinéraire artisanat",
      description: "Cinq jours immersifs pour découvrir l'artisanat de Marrakech — ateliers, souks, designers et adresses confidentielles.",
      datePublished: "2026-01-15T08:00:00+01:00",
    },
  },
  {
    slug: "galeries-art-marrakech",
    file: "src/pages/MarrakechGaleriesArt.tsx",
    template: "custom",
    sortOrder: 95,
    customMeta: {
      title: "Galeries d'art à Marrakech",
      description: "Notre sélection des galeries d'art contemporain et des espaces d'exposition incontournables à Marrakech.",
      datePublished: "2026-02-01T08:00:00+01:00",
    },
  },
  { slug: "louer-villa-vacances-marrakech", file: "src/pages/LouerVillaVacancesMarrakech.tsx", template: "custom", sortOrder: 90 },
  { slug: "fermes-pedagogiques-marrakech", file: "src/pages/FermesPedagogiquesMarrakech.tsx", template: "article_template", sortOrder: 80 },
  { slug: "idee-cadeau-marrakech", file: "src/pages/IdeeCadeauMarrakech.tsx", template: "article_template", sortOrder: 75, customHeroAssetFile: "src/assets/idee-cadeau-marrakech-hero.jpg.asset.json" },
  { slug: "activites-enfants-marrakech", file: "src/pages/ActivitesEnfantsMarrakech.tsx", template: "article_template", sortOrder: 70 },
  { slug: "artisanat-medina-marrakech", file: "src/pages/ArtisanatMedinaMarrakech.tsx", template: "article_template", sortOrder: 65 },
  { slug: "street-food-marrakech", file: "src/pages/StreetFoodMarrakech.tsx", template: "article_template", sortOrder: 60 },
  { slug: "shopping-fashion-gueliz", file: "src/pages/ShoppingFashionGueliz.tsx", template: "article_template", sortOrder: 55 },
  { slug: "beach-clubs-marrakech", file: "src/pages/BeachClubsMarrakech.tsx", template: "article_template", sortOrder: 50 },
  { slug: "hotels-riads-vue-mer-essaouira", file: "src/pages/HotelsRiadsVueMerEssaouira.tsx", template: "article_template", sortOrder: 45, customHeroAssetFile: "src/assets/essaouira-sunset-roof.jpg.asset.json" },
  { slug: "manger-fruits-de-mer-essaouira", file: "src/pages/FruitsDeMerEssaouira.tsx", template: "article_template", sortOrder: 40, customHeroAssetFile: "src/assets/essaouira-lobster-hero.jpg.asset.json" },
  { slug: "hebergements-sidi-kaouki", file: "src/pages/HebergementsSidiKaouki.tsx", template: "article_template", sortOrder: 35 },
  { slug: "agafay-dream", file: "src/pages/AgafayDream.tsx", template: "article_template", sortOrder: 30 },
  { slug: "louer-villa-complexe-hotelier-marrakech", file: "src/pages/LouerVillaComplexeHotelierMarrakech.tsx", template: "article_template", sortOrder: 25 },
];

// ---- AST helpers ---------------------------------------------------------

function evalStringLiteral(node: ts.Node): string | undefined {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    // join head + spans (ignore expressions, take only text)
    let out = node.head.text;
    for (const span of node.templateSpans) out += span.literal.text;
    return out;
  }
  return undefined;
}

function evalStringArray(node: ts.Node): string[] | undefined {
  if (!ts.isArrayLiteralExpression(node)) return undefined;
  const out: string[] = [];
  for (const el of node.elements) {
    const s = evalStringLiteral(el);
    if (s === undefined) return undefined;
    out.push(s);
  }
  return out;
}

function evalObjectEntry(node: ts.Node): any | undefined {
  if (!ts.isObjectLiteralExpression(node)) return undefined;
  const obj: any = {};
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const key = prop.name.getText();
    const init = prop.initializer;
    const s = evalStringLiteral(init);
    if (s !== undefined) { obj[key] = s; continue; }
    const arr = evalStringArray(init);
    if (arr !== undefined) { obj[key] = arr; continue; }
    // skip unknown shapes silently
  }
  return obj;
}

function findEntriesArray(sf: ts.SourceFile): any[] | null {
  let result: any[] | null = null;
  function visit(node: ts.Node) {
    if (result) return;
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        const typeText = decl.type?.getText() ?? "";
        if (typeText.includes("BlogArticleEntry[]") && decl.initializer && ts.isArrayLiteralExpression(decl.initializer)) {
          const entries: any[] = [];
          for (const el of decl.initializer.elements) {
            const e = evalObjectEntry(el);
            if (e) entries.push(e);
          }
          result = entries;
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return result;
}

function findTemplateProps(sf: ts.SourceFile): Record<string, any> {
  const props: Record<string, any> = {};
  function visit(node: ts.Node) {
    let opening: ts.JsxOpeningLikeElement | null = null;
    if (ts.isJsxSelfClosingElement(node)) opening = node;
    else if (ts.isJsxElement(node)) opening = node.openingElement;
    if (opening && opening.tagName.getText() === "BlogArticleTemplate") {
      for (const attr of opening.attributes.properties) {
        if (!ts.isJsxAttribute(attr)) continue;
        const name = attr.name.getText();
        const init = attr.initializer;
        if (!init) { props[name] = true; continue; }
        if (ts.isStringLiteral(init)) { props[name] = init.text; continue; }
        if (ts.isJsxExpression(init) && init.expression) {
          const s = evalStringLiteral(init.expression);
          if (s !== undefined) { props[name] = s; continue; }
          // property access like heroLobster.url → mark with a sentinel
          props[name] = { __expr: init.expression.getText() };
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return props;
}

// ---- Main ----------------------------------------------------------------

function extract(article: Article) {
  const code = fs.readFileSync(article.file, "utf8");
  const sf = ts.createSourceFile(article.file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const entries = findEntriesArray(sf);
  const props = findTemplateProps(sf);

  // Resolve customHeroImage from asset.json if provided
  let customHeroUrl: string | null = null;
  if (article.customHeroAssetFile && fs.existsSync(article.customHeroAssetFile)) {
    const asset = JSON.parse(fs.readFileSync(article.customHeroAssetFile, "utf8"));
    customHeroUrl = asset.url ?? null;
  }

  // Inject manual metadata for fully-custom articles
  if (article.customMeta) {
    props.articleTitle = props.articleTitle ?? article.customMeta.title;
    props.articleDescription = props.articleDescription ?? article.customMeta.description;
    if (article.customMeta.datePublished && !props.datePublished) {
      props.datePublished = article.customMeta.datePublished;
    }
  }

  return {
    slug: article.slug,
    template: article.template,
    sort_order: article.sortOrder,
    entries,
    props,
    customHeroUrl,
  };
}

const out = ARTICLES.map(extract);
const outPath = path.join("scripts", "blog-articles.extracted.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${outPath} — ${out.length} articles`);
for (const a of out) {
  console.log(` - ${a.slug}: template=${a.template} entries=${a.entries?.length ?? "—"} props=${Object.keys(a.props).join(",")}`);
}
