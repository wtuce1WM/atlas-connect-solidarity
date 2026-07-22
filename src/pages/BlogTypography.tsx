import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";

const sampleText = "One World Morocco — Découvrez les meilleures adresses au Maroc";
const sampleArabic = "اكتشف أفضل العناوين في المغرب";
const lorem = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

const BlogTypography = () => {
  const navigate = useLocalizedNavigate();

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
          <h1 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 300, letterSpacing: "0.08em" }}>
            Guide Typographique
          </h1>
          <p className="text-white/60 mt-2">Référence des polices et balises réellement utilisées sur le site</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-16 max-w-4xl">

        {/* ── Section 1: Fonts chargées ── */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-3">1. Polices chargées (Google Fonts)</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Déclarées dans <code className="bg-muted px-1.5 py-0.5 rounded text-xs">index.html</code> et exposées via Tailwind dans <code className="bg-muted px-1.5 py-0.5 rounded text-xs">tailwind.config.ts</code>.
          </p>
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
                  <td className="p-3 font-medium text-foreground">Montserrat</td>
                  <td className="p-3 text-muted-foreground">Navigation, boutons, labels, CTA, noms de fiches, headings prose</td>
                  <td className="p-3 text-muted-foreground">300, 400, 600</td>
                  <td className="p-3 font-josefin text-lg text-foreground" style={{ letterSpacing: "0.08em" }}>Marrakech</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-foreground">Avenir <span className="text-xs text-muted-foreground">(fallback Nunito Sans)</span></td>
                  <td className="p-3 text-muted-foreground">Corps de texte (<code className="bg-muted px-1 rounded text-xs">body</code>) + titres globaux <code className="bg-muted px-1 rounded text-xs">h1/h2/h3</code></td>
                  <td className="p-3 text-muted-foreground">Système / Nunito Sans 300, 400, 500, 700, 400i</td>
                  <td className="p-3 font-roboto text-lg text-foreground">Essaouira la Mogador</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-foreground">Amiri</td>
                  <td className="p-3 text-muted-foreground">Titres et citations arabes</td>
                  <td className="p-3 text-muted-foreground">400, 700</td>
                  <td className="p-3 text-lg text-foreground" style={{ fontFamily: "'Amiri', serif" }} dir="rtl">{sampleArabic}</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-foreground">Noto Sans Arabic <span className="text-xs text-muted-foreground">(système)</span></td>
                  <td className="p-3 text-muted-foreground">Corps de texte arabe via <code className="bg-muted px-1 rounded text-xs">.font-arabic</code></td>
                  <td className="p-3 text-muted-foreground">Fallback système</td>
                  <td className="p-3 font-arabic text-lg text-foreground" dir="rtl">{sampleArabic}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Section 2: Balises HTML globales ── */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">2. Balises HTML — Styles globaux (index.css)</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Règles appliquées automatiquement à toutes les balises du site.
          </p>

          <div className="space-y-8">
            {/* h1, h2, h3 */}
            <div className="border border-border rounded-lg p-6">
              <div className="flex items-baseline justify-between mb-3">
                <code className="bg-muted px-2 py-1 rounded text-xs text-foreground">&lt;h1&gt; &lt;h2&gt; &lt;h3&gt;</code>
                <span className="text-xs text-muted-foreground">font-family: 'Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif · font-weight: 500</span>
              </div>
              <h1 className="text-4xl text-foreground mb-2">H1 — {sampleText}</h1>
              <h2 className="text-3xl text-foreground mb-2">H2 — {sampleText}</h2>
              <h3 className="text-2xl text-foreground">H3 — {sampleText}</h3>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                h1, h2, h3 {"{"} font-family: 'Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif; font-weight: 500; {"}"}
              </div>
            </div>

            {/* h4, h5, h6 */}
            <div className="border border-border rounded-lg p-6">
              <div className="flex items-baseline justify-between mb-3">
                <code className="bg-muted px-2 py-1 rounded text-xs text-foreground">&lt;h4&gt; &lt;h5&gt; &lt;h6&gt;</code>
                <span className="text-xs text-muted-foreground">Pas de style global — héritent du body (Avenir)</span>
              </div>
              <h4 className="text-xl font-semibold text-foreground mb-1">H4 — {sampleText}</h4>
              <h5 className="text-lg font-semibold text-foreground mb-1">H5 — {sampleText}</h5>
              <h6 className="text-base font-semibold text-foreground">H6 — {sampleText}</h6>
            </div>

            {/* body / p */}
            <div className="border border-border rounded-lg p-6">
              <div className="flex items-baseline justify-between mb-3">
                <code className="bg-muted px-2 py-1 rounded text-xs text-foreground">&lt;body&gt; &lt;p&gt;</code>
                <span className="text-xs text-muted-foreground">font-family: 'Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif · letter-spacing: 0.02em</span>
              </div>
              <p className="text-foreground">{lorem}</p>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                body {"{"} font-family: 'Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif; letter-spacing: 0.02em; {"}"}
              </div>
            </div>

            {/* nav, button, label */}
            <div className="border border-border rounded-lg p-6">
              <div className="flex items-baseline justify-between mb-3">
                <code className="bg-muted px-2 py-1 rounded text-xs text-foreground">&lt;nav&gt; &lt;button&gt; &lt;label&gt; .uppercase</code>
                <span className="text-xs text-muted-foreground">Montserrat 300 · uppercase · tracking 0.12em</span>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <nav className="text-foreground">Recherche</nav>
                <button type="button" className="text-foreground border border-border rounded px-3 py-1.5">Découvrir</button>
                <label className="text-foreground">Email</label>
                <span className="uppercase text-foreground">Nouveau</span>
              </div>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                nav, button, [role="button"], label, .uppercase {"{"}<br/>
                &nbsp;&nbsp;font-family: 'Montserrat', sans-serif;<br/>
                &nbsp;&nbsp;font-weight: 300; text-transform: uppercase; letter-spacing: 0.12em;<br/>
                {"}"}
              </div>
            </div>

            {/* strong, em */}
            <div className="border border-border rounded-lg p-6">
              <div className="flex items-baseline justify-between mb-3">
                <code className="bg-muted px-2 py-1 rounded text-xs text-foreground">&lt;strong&gt; &lt;em&gt; &lt;small&gt;</code>
              </div>
              <div className="space-y-2 text-foreground">
                <p><strong>strong — texte en gras</strong></p>
                <p><em>em — texte en italique (Avenir / Nunito Sans italic 400i)</em></p>
                <p><small className="text-muted-foreground">small — métadonnées</small></p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 3: Classes utilitaires ── */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">3. Classes utilitaires (Tailwind / Custom)</h2>
          <div className="space-y-6">

            <div className="border border-border rounded-lg p-6">
              <code className="bg-muted px-2 py-1 rounded text-xs text-foreground">font-josefin</code>
              <p className="font-josefin text-2xl mt-3 text-foreground">
                Montserrat — utilitaire Tailwind
              </p>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                tailwind.config.ts: fontFamily.josefin = ['Montserrat', 'sans-serif']
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <code className="bg-muted px-2 py-1 rounded text-xs text-foreground">font-roboto</code>
              <p className="font-roboto text-2xl mt-3 text-foreground">
                Avenir — utilitaire Tailwind
              </p>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                tailwind.config.ts: fontFamily.roboto = ['Avenir Next','Avenir','Nunito Sans','system-ui','sans-serif']
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <code className="bg-muted px-2 py-1 rounded text-xs text-foreground">.josefin-headings</code>
              <div className="josefin-headings mt-3">
                <h3 className="text-2xl text-foreground">Titre injecté en Montserrat (non-uppercase)</h3>
              </div>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                Force Montserrat sur h1-h6 dans du HTML injecté · letter-spacing: 0.02em
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <code className="bg-muted px-2 py-1 rounded text-xs text-foreground">.prose-josefin-headings</code>
              <div className="prose-josefin-headings mt-3">
                <h2 className="text-2xl text-foreground">Section en Montserrat (uppercase)</h2>
                <h3 className="text-xl text-foreground mt-2">Sous-section en Montserrat</h3>
              </div>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                Utilisé dans les blocs de description riche (h2 = uppercase, h3 = casse normale)
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <code className="bg-muted px-2 py-1 rounded text-xs text-foreground">.font-arabic</code>
              <p className="font-arabic text-lg mt-3 text-foreground" dir="rtl">
                {sampleArabic}
              </p>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                .font-arabic {"{"} font-family: 'Noto Sans Arabic', 'Segoe UI', Tahoma, sans-serif; {"}"}
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
          <p className="text-muted-foreground mb-4 text-sm">
            Montserrat n'est chargée qu'en 300/400/600 — Avenir s'appuie sur la stack système avec Nunito Sans (300/400/500/700) comme fallback web.
          </p>
          <div className="space-y-3">
            {[
              { cls: "font-light", label: "font-light (300)" },
              { cls: "font-normal", label: "font-normal (400)" },
              { cls: "font-medium", label: "font-medium (500)" },
              { cls: "font-semibold", label: "font-semibold (600)" },
              { cls: "font-bold", label: "font-bold (700)" },
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
              <span className="text-lg font-bold tracking-tight">
                <span className="text-gold">ONE WORLD</span>{" "}
                <span className="text-foreground">MOROCCO</span>
              </span>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                text-lg font-bold tracking-tight · text-gold + text-foreground
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <span className="text-xs text-muted-foreground mb-2 block">Navigation — Lien menu</span>
              <nav className="text-foreground hover:text-gold cursor-pointer inline-block">Recherche</nav>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                &lt;nav&gt; auto: Montserrat 300 uppercase, tracking 0.12em
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <span className="text-xs text-muted-foreground mb-2 block">Section — Titre h2</span>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Les meilleures adresses
              </h2>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                h2 auto: Avenir 500 · tailles via classes Tailwind
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <span className="text-xs text-muted-foreground mb-2 block">Carte business — Nom</span>
              <h3 className="text-lg font-semibold text-foreground">Restaurant Le Jardin</h3>
              <p className="text-sm text-muted-foreground mt-1">Marrakech · Gastronomie</p>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                h3 auto: Avenir 500 · p: Avenir · text-sm text-muted-foreground
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <span className="text-xs text-muted-foreground mb-2 block">CTA — Bouton doré</span>
              <button type="button" className="inline-block rounded-lg bg-gold px-4 py-2 font-semibold text-gold-foreground">
                Devenir affilié
              </button>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                &lt;button&gt; auto: Montserrat 300 uppercase · bg-gold text-gold-foreground
              </div>
            </div>

            <div className="border border-border rounded-lg p-6">
              <span className="text-xs text-muted-foreground mb-2 block">Citation arabe</span>
              <p className="text-2xl text-foreground" style={{ fontFamily: "'Amiri', serif" }} dir="rtl">
                {sampleArabic}
              </p>
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
                font-family: 'Amiri', serif · dir="rtl"
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
              { cls: "text-gold", label: "text-gold", desc: "Or / Gold accent" },
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
