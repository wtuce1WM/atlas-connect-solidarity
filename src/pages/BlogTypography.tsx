import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const sampleText = "One World Morocco — Découvrez les meilleures adresses au Maroc";
const sampleArabic = "اكتشف أفضل العناوين في المغرب";
const lorem = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.";

const BlogTypography = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="bg-black pt-28 pb-12">
        <div className="container mx-auto px-4">
          <button
            onClick={() => navigate("/blog")}
            className="inline-flex items-center gap-2 text-white/60 hover:text-gold mb-4 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au blog
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-white font-['Playfair_Display'] italic">
            Guide Typographique
          </h1>
          <p className="text-white/60 mt-2">Référence des polices et balises utilisées sur le site</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-16 max-w-4xl">

        {/* ── Section 1: Fonts chargées ── */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">1. Polices chargées (Google Fonts)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-semibold text-foreground">Police</th>
                  <th className="text-left p-3 font-semibold text-foreground">Usage principal</th>
                  <th className="text-left p-3 font-semibold text-foreground">Poids chargés</th>
                  <th className="text-left p-3 font-semibold text-foreground">Aperçu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-3 font-medium text-foreground">Playfair Display</td>
                  <td className="p-3 text-muted-foreground">Titres <code className="bg-muted px-1 rounded text-xs">&lt;h2&gt;</code></td>
                  <td className="p-3 text-muted-foreground">400, 600, 700</td>
                  <td className="p-3 font-['Playfair_Display'] italic text-lg text-foreground">Marrakech</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-foreground">Raleway</td>
                  <td className="p-3 text-muted-foreground">Sous-titres <code className="bg-muted px-1 rounded text-xs">&lt;h3&gt;</code></td>
                  <td className="p-3 text-muted-foreground">600</td>
                  <td className="p-3 font-['Raleway'] font-semibold text-lg text-foreground">Essaouira</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-foreground">Cormorant Garamond</td>
                  <td className="p-3 text-muted-foreground">Texte éditorial / élégant</td>
                  <td className="p-3 text-muted-foreground">400, 600, 400i, 600i</td>
                  <td className="p-3 font-['Cormorant_Garamond'] text-lg text-foreground">Fès la Spirituelle</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-foreground">Amiri</td>
                  <td className="p-3 text-muted-foreground">Titres arabes / oriental</td>
                  <td className="p-3 text-muted-foreground">400, 700</td>
                  <td className="p-3 font-['Amiri'] text-lg text-foreground" dir="rtl">{sampleArabic}</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-foreground">Noto Sans Arabic</td>
                  <td className="p-3 text-muted-foreground">Corps de texte arabe <code className="bg-muted px-1 rounded text-xs">.font-arabic</code></td>
                  <td className="p-3 text-muted-foreground">Variable</td>
                  <td className="p-3 font-arabic text-lg text-foreground" dir="rtl">{sampleArabic}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Section 2: Balises HTML globales ── */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">2. Balises HTML — Styles globaux (index.css)</h2>
          <p className="text-muted-foreground mb-6">
            Ces styles sont définis globalement dans <code className="bg-muted px-1.5 py-0.5 rounded text-xs text-foreground">index.css</code> et s'appliquent automatiquement.
          </p>

          <div className="space-y-8">
            {/* h1 */}
            <div className="border border-border rounded-lg p-6">
              <div className="flex items-baseline justify-between mb-3">
                <code className="bg-muted px-2 py-1 rounded text-xs text-foreground">&lt;h1&gt;</code>
                <span className="text-xs text-muted-foreground">Pas de style global — stylé via classes Tailwind</span>
              </div>
              <h1 className="text-4xl font-bold text-foreground">
                {sampleText}
              </h1>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                font: hérite du body (sans-serif système)<br/>
                usage: titre principal de page, souvent avec classes manuelles
              </div>
            </div>

            {/* h2 */}
            <div className="border border-border rounded-lg p-6">
              <div className="flex items-baseline justify-between mb-3">
                <code className="bg-muted px-2 py-1 rounded text-xs text-foreground">&lt;h2&gt;</code>
                <span className="text-xs text-muted-foreground">font-family: 'Playfair Display', serif · font-style: italic</span>
              </div>
              <h2 className="text-3xl font-bold text-foreground">
                {sampleText}
              </h2>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                CSS global: h2 {"{"} font-family: 'Playfair Display', serif; font-style: italic; {"}"}<br/>
                usage: titres de sections, titres de cartes
              </div>
            </div>

            {/* h3 */}
            <div className="border border-border rounded-lg p-6">
              <div className="flex items-baseline justify-between mb-3">
                <code className="bg-muted px-2 py-1 rounded text-xs text-foreground">&lt;h3&gt;</code>
                <span className="text-xs text-muted-foreground">font-family: 'Raleway', sans-serif</span>
              </div>
              <h3 className="text-2xl font-semibold text-foreground">
                {sampleText}
              </h3>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                CSS global: h3 {"{"} font-family: 'Raleway', sans-serif; {"}"}<br/>
                usage: sous-titres, noms de catégories
              </div>
            </div>

            {/* h4, h5, h6 */}
            <div className="border border-border rounded-lg p-6">
              <div className="flex items-baseline justify-between mb-3">
                <code className="bg-muted px-2 py-1 rounded text-xs text-foreground">&lt;h4&gt; &lt;h5&gt; &lt;h6&gt;</code>
                <span className="text-xs text-muted-foreground">Pas de style global</span>
              </div>
              <h4 className="text-xl font-semibold text-foreground mb-1">H4 — {sampleText}</h4>
              <h5 className="text-lg font-semibold text-foreground mb-1">H5 — {sampleText}</h5>
              <h6 className="text-base font-semibold text-foreground">H6 — {sampleText}</h6>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                hérite du body (sans-serif système)<br/>
                usage: titres tertiaires, labels
              </div>
            </div>

            {/* p */}
            <div className="border border-border rounded-lg p-6">
              <div className="flex items-baseline justify-between mb-3">
                <code className="bg-muted px-2 py-1 rounded text-xs text-foreground">&lt;p&gt;</code>
                <span className="text-xs text-muted-foreground">Sans-serif système (Tailwind default)</span>
              </div>
              <p className="text-foreground">{lorem}</p>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                font: sans-serif système via Tailwind<br/>
                usage: paragraphes, descriptions
              </div>
            </div>

            {/* span, small, strong, em */}
            <div className="border border-border rounded-lg p-6">
              <div className="flex items-baseline justify-between mb-3">
                <code className="bg-muted px-2 py-1 rounded text-xs text-foreground">&lt;span&gt; &lt;strong&gt; &lt;em&gt; &lt;small&gt;</code>
              </div>
              <div className="space-y-2 text-foreground">
                <p><span>span — texte normal inline</span></p>
                <p><strong>strong — texte en gras</strong></p>
                <p><em>em — texte en italique</em></p>
                <p><small className="text-muted-foreground">small — texte réduit, souvent pour les métadonnées</small></p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 3: Classes utilitaires ── */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">3. Classes utilitaires (Tailwind / Custom)</h2>
          <div className="space-y-6">

            <div className="border border-border rounded-lg p-6">
              <code className="bg-muted px-2 py-1 rounded text-xs text-foreground">.font-arabic</code>
              <p className="font-arabic text-lg mt-3 text-foreground" dir="rtl">
                {sampleArabic} — Noto Sans Arabic, Segoe UI, Tahoma
              </p>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                CSS: .font-arabic {"{"} font-family: 'Noto Sans Arabic', 'Segoe UI', Tahoma, sans-serif; {"}"}
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <code className="bg-muted px-2 py-1 rounded text-xs text-foreground">font-['Playfair_Display']</code>
              <p className="font-['Playfair_Display'] italic text-2xl mt-3 text-foreground">
                Classe Tailwind arbitraire pour Playfair Display
              </p>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                usage: quand on veut Playfair Display sur une balise autre que h2
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <code className="bg-muted px-2 py-1 rounded text-xs text-foreground">font-['Cormorant_Garamond']</code>
              <p className="font-['Cormorant_Garamond'] text-2xl mt-3 text-foreground">
                Classe Tailwind arbitraire pour Cormorant Garamond
              </p>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                usage: textes éditoriaux, citations
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <code className="bg-muted px-2 py-1 rounded text-xs text-foreground">font-['Amiri']</code>
              <p className="font-['Amiri'] text-2xl mt-3 text-foreground">
                Classe Tailwind arbitraire pour Amiri — style oriental
              </p>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                usage: titres orientaux, citations arabes
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 4: Tailles Tailwind ── */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">4. Échelle de tailles Tailwind</h2>
          <div className="space-y-3">
            {[
              { cls: "text-xs", label: "text-xs (0.75rem / 12px)" },
              { cls: "text-sm", label: "text-sm (0.875rem / 14px)" },
              { cls: "text-base", label: "text-base (1rem / 16px)" },
              { cls: "text-lg", label: "text-lg (1.125rem / 18px)" },
              { cls: "text-xl", label: "text-xl (1.25rem / 20px)" },
              { cls: "text-2xl", label: "text-2xl (1.5rem / 24px)" },
              { cls: "text-3xl", label: "text-3xl (1.875rem / 30px)" },
              { cls: "text-4xl", label: "text-4xl (2.25rem / 36px)" },
              { cls: "text-5xl", label: "text-5xl (3rem / 48px)" },
            ].map(({ cls, label }) => (
              <div key={cls} className="flex items-baseline gap-4 border-b border-border pb-2">
                <code className="bg-muted px-2 py-0.5 rounded text-xs text-foreground shrink-0 w-64">{label}</code>
                <span className={`${cls} text-foreground`}>Marrakech</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 5: Poids ── */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">5. Poids de police (font-weight)</h2>
          <div className="space-y-3">
            {[
              { cls: "font-light", label: "font-light (300)" },
              { cls: "font-normal", label: "font-normal (400)" },
              { cls: "font-medium", label: "font-medium (500)" },
              { cls: "font-semibold", label: "font-semibold (600)" },
              { cls: "font-bold", label: "font-bold (700)" },
              { cls: "font-extrabold", label: "font-extrabold (800)" },
            ].map(({ cls, label }) => (
              <div key={cls} className="flex items-baseline gap-4 border-b border-border pb-2">
                <code className="bg-muted px-2 py-0.5 rounded text-xs text-foreground shrink-0 w-52">{label}</code>
                <span className={`${cls} text-xl text-foreground`}>One World Morocco</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 6: Combinaisons réelles ── */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">6. Combinaisons utilisées sur le site</h2>
          <div className="space-y-6">

            <div className="border border-border rounded-lg p-6">
              <span className="text-xs text-muted-foreground mb-2 block">Header — Logo</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight">
                  <span className="text-gold">ONE WORLD</span>{" "}
                  <span className="text-foreground">MOROCCO</span>
                </span>
              </div>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                text-lg font-bold tracking-tight · text-gold + text-foreground
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <span className="text-xs text-muted-foreground mb-2 block">Hero — Titre principal</span>
              <h1 className="text-4xl md:text-6xl font-bold text-foreground font-['Playfair_Display'] italic">
                Découvrez le Maroc
              </h1>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                text-4xl md:text-6xl font-bold font-['Playfair_Display'] italic
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <span className="text-xs text-muted-foreground mb-2 block">Section — Titre h2</span>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Les meilleures adresses
              </h2>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                h2 auto: Playfair Display italic · text-2xl md:text-3xl font-bold
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <span className="text-xs text-muted-foreground mb-2 block">Carte business — Nom</span>
              <h3 className="text-lg font-semibold text-foreground">Restaurant Le Jardin</h3>
              <p className="text-sm text-muted-foreground mt-1">Marrakech · Gastronomie</p>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                h3 auto: Raleway sans-serif · text-lg font-semibold<br/>
                p: text-sm text-muted-foreground
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <span className="text-xs text-muted-foreground mb-2 block">Blog — Titre article</span>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground font-['Playfair_Display'] italic">
                Essaouira, perle de l'Atlantique
              </h1>
              <p className="text-muted-foreground mt-2">Démonstration des styles éditoriaux</p>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                text-3xl md:text-4xl font-bold font-['Playfair_Display'] italic
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <span className="text-xs text-muted-foreground mb-2 block">Navigation — Lien menu</span>
              <span className="text-foreground transition-colors hover:text-gold cursor-pointer">
                Recherche
              </span>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                text-foreground hover:text-gold · sans-serif système
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <span className="text-xs text-muted-foreground mb-2 block">CTA — Bouton doré</span>
              <span className="inline-block rounded-lg bg-gold px-4 py-2 font-semibold text-gold-foreground cursor-pointer">
                Devenir affilié
              </span>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                rounded-lg bg-gold px-4 py-2 font-semibold text-gold-foreground
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 7: Couleurs texte ── */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">7. Couleurs de texte (tokens sémantiques)</h2>
          <div className="space-y-3">
            {[
              { cls: "text-foreground", label: "text-foreground", desc: "Texte principal" },
              { cls: "text-muted-foreground", label: "text-muted-foreground", desc: "Texte secondaire / atténué" },
              { cls: "text-primary", label: "text-primary", desc: "Terracotta" },
              { cls: "text-secondary", label: "text-secondary", desc: "Majorelle Blue" },
              { cls: "text-gold", label: "text-gold", desc: "Or / Gold accent" },
              { cls: "text-atlas", label: "text-atlas", desc: "Atlas Green" },
              { cls: "text-destructive", label: "text-destructive", desc: "Erreur / destructif" },
            ].map(({ cls, label, desc }) => (
              <div key={cls} className="flex items-baseline gap-4 border-b border-border pb-2">
                <code className="bg-muted px-2 py-0.5 rounded text-xs text-foreground shrink-0 w-56">{label}</code>
                <span className={`${cls} text-lg font-medium`}>{desc} — Marrakech</span>
              </div>
            ))}
          </div>
        </section>

      </div>

      <Footer />
    </div>
  );
};

export default BlogTypography;
