import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";

const BlogBrummellTypography = () => {
  const navigate = useLocalizedNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <div className="bg-[#1a1a1a] pt-28 pb-16">
        <div className="container mx-auto px-4">
          <button
            onClick={() => navigate("/blog")}
            className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors text-sm tracking-[0.2em] uppercase"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au blog
          </button>
          <h1 className="text-4xl md:text-6xl font-light text-white tracking-[0.15em] uppercase">
            Brummell
          </h1>
          <p className="text-white/40 mt-3 tracking-[0.1em] uppercase text-sm">
            Analyse typographique — brummellprojects.com
          </p>
          <a
            href="https://brummellprojects.com/fr/marrakech/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-white/60 hover:text-white text-xs tracking-[0.15em] uppercase transition-colors"
          >
            Voir le site <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-5xl space-y-20">

        {/* Section 1 — Philosophie */}
        <section>
          <h2 className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-8 border-b border-border pb-3">
            01 — Philosophie typographique
          </h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <p className="text-foreground/80 leading-relaxed">
                Brummell adopte une approche <strong>éditoriale luxe</strong> avec un contraste marqué entre deux registres typographiques : une police géométrique sans-serif pour les titres et la navigation, et une serif élégante pour le corps de texte.
              </p>
              <p className="text-foreground/80 leading-relaxed mt-4">
                L'identité repose sur un <strong>lettrage espacé</strong>, des majuscules omniprésentes dans les éléments d'interface, et une sobriété chromatique (noir, blanc, touches dorées).
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-8 border border-border">
              <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-4">Principes clés</p>
              <ul className="space-y-3 text-sm text-foreground/70">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">→</span>
                  Contraste sans-serif géométrique / serif classique
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">→</span>
                  Lettrage espacé (letter-spacing élevé)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">→</span>
                  Tout en majuscules pour la navigation & CTA
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">→</span>
                  Palette minimale : noir, blanc, or discret
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 2 — Police Display : Venus */}
        <section>
          <h2 className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-8 border-b border-border pb-3">
            02 — Police Display — Venus
          </h2>
          <div className="space-y-8">
            <div className="bg-[#1a1a1a] rounded-xl p-10 md:p-16 text-center space-y-6">
              <p className="text-white text-5xl md:text-7xl font-light tracking-[0.25em] uppercase">
                Marrakech
              </p>
              <p className="text-white/40 text-sm tracking-[0.2em] uppercase">
                Venus · Display · Uppercase · Tracking 0.25em
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="border border-border rounded-lg p-8">
                <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4">Navigation</p>
                <div className="space-y-3">
                  <p className="text-sm tracking-[0.2em] uppercase font-light">Hébergements</p>
                  <p className="text-sm tracking-[0.2em] uppercase font-light">Expériences</p>
                  <p className="text-sm tracking-[0.2em] uppercase font-light">À propos</p>
                  <p className="text-sm tracking-[0.2em] uppercase font-light">Contact</p>
                </div>
              </div>
              <div className="border border-border rounded-lg p-8">
                <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4">CTA / Boutons</p>
                <div className="space-y-4">
                  <button className="w-full border border-foreground/30 text-foreground text-xs tracking-[0.25em] uppercase py-3 px-6 hover:bg-foreground hover:text-background transition-colors">
                    Réserver
                  </button>
                  <button className="w-full bg-foreground text-background text-xs tracking-[0.25em] uppercase py-3 px-6 hover:bg-foreground/80 transition-colors">
                    Découvrir
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-muted/20 rounded-lg p-6 text-sm text-foreground/70 space-y-2">
              <p><strong>Famille :</strong> Venus (ou Venus Rising) — géométrique, sans-serif</p>
              <p><strong>Graisse :</strong> Light à Regular</p>
              <p><strong>Casse :</strong> Toujours en majuscules (text-transform: uppercase)</p>
              <p><strong>Letter-spacing :</strong> 0.15em à 0.30em selon le contexte</p>
              <p><strong>Usage :</strong> Titres, navigation, boutons, mentions</p>
              <p><strong>Classe CSS observée :</strong> <code className="bg-muted px-2 py-0.5 rounded text-xs">.venus-small</code></p>
            </div>
          </div>
        </section>

        {/* Section 3 — Police Corps : Serif */}
        <section>
          <h2 className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-8 border-b border-border pb-3">
            03 — Police Corps — Serif éditoriale
          </h2>
          <div className="space-y-8">
            <div className="bg-[#f5f0eb] dark:bg-[#2a2520] rounded-xl p-10 md:p-16 space-y-6">
              <p className="text-[#1a1a1a] dark:text-[#e8e0d6] text-2xl md:text-3xl font-serif leading-relaxed italic">
                « Au cœur de la Médina, Maison Brummell réinvente l'hospitalité marocaine avec une sensibilité contemporaine et un souci du détail absolu. »
              </p>
              <p className="text-[#1a1a1a]/40 dark:text-[#e8e0d6]/40 text-sm tracking-[0.2em] uppercase">
                Freight Text · Serif · Italic · Corps de texte
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="border border-border rounded-lg p-8">
                <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4">Texte courant</p>
                <p className="font-serif text-base leading-[1.8] text-foreground/80">
                  Chaque chambre est une invitation au voyage, où les matériaux nobles rencontrent l'artisanat local. Les zellige traditionnels côtoient un mobilier épuré, créant un dialogue entre héritage et modernité.
                </p>
              </div>
              <div className="border border-border rounded-lg p-8">
                <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4">Citations & accroches</p>
                <p className="font-serif text-xl italic leading-relaxed text-foreground/80">
                  Un lieu où le temps s'arrête, entre les murs ocre de la ville rouge.
                </p>
              </div>
            </div>

            <div className="bg-muted/20 rounded-lg p-6 text-sm text-foreground/70 space-y-2">
              <p><strong>Famille :</strong> Freight Text / Freight Display — serif humaniste</p>
              <p><strong>Graisse :</strong> Regular, avec usage fréquent de l'italique</p>
              <p><strong>Taille corps :</strong> 16–18px (corps), 24–32px (accroches)</p>
              <p><strong>Interlignage :</strong> 1.6 à 1.8 (très aéré)</p>
              <p><strong>Usage :</strong> Descriptions, paragraphes, citations, hooks</p>
            </div>
          </div>
        </section>

        {/* Section 4 — Palette chromatique */}
        <section>
          <h2 className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-8 border-b border-border pb-3">
            04 — Palette chromatique
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { name: "Noir profond", hex: "#1a1a1a", text: "white" },
              { name: "Blanc cassé", hex: "#f5f0eb", text: "#1a1a1a" },
              { name: "Or discret", hex: "#c4a265", text: "white" },
              { name: "Gris chaud", hex: "#8a8078", text: "white" },
              { name: "Terre cuite", hex: "#b5836a", text: "white" },
            ].map((color) => (
              <div key={color.hex} className="space-y-2">
                <div
                  className="aspect-square rounded-lg border border-border flex items-end p-3"
                  style={{ backgroundColor: color.hex, color: color.text }}
                >
                  <span className="text-xs font-mono">{color.hex}</span>
                </div>
                <p className="text-xs text-muted-foreground text-center">{color.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5 — Hiérarchie */}
        <section>
          <h2 className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-8 border-b border-border pb-3">
            05 — Hiérarchie typographique complète
          </h2>
          <div className="space-y-0 border border-border rounded-xl overflow-hidden">
            {[
              { level: "H1 — Hero", style: "text-5xl md:text-7xl font-light tracking-[0.25em] uppercase", text: "MARRAKECH", desc: "Venus · 60–80px · tracking 0.25em · uppercase" },
              { level: "H2 — Section", style: "text-3xl md:text-4xl font-light tracking-[0.15em] uppercase", text: "HÉBERGEMENTS", desc: "Venus · 36–48px · tracking 0.15em · uppercase" },
              { level: "H3 — Sous-titre", style: "text-xl tracking-[0.12em] uppercase font-light", text: "MAISON BRUMMELL MAJORELLE", desc: "Venus Small · 20px · tracking 0.12em · uppercase" },
              { level: "Accroche", style: "text-2xl font-serif italic", text: "Une oasis de calme au cœur de la Médina", desc: "Freight Display · 24–28px · italic" },
              { level: "Corps", style: "text-base font-serif leading-[1.8]", text: "Chaque détail a été pensé pour offrir une expérience unique, entre tradition marocaine et design contemporain.", desc: "Freight Text · 16–18px · line-height 1.8" },
              { level: "Légende", style: "text-xs tracking-[0.2em] uppercase text-muted-foreground", text: "PHOTOGRAPHIE · MARRAKECH · 2024", desc: "Venus · 11–12px · tracking 0.2em · uppercase · gris" },
            ].map((item, i) => (
              <div key={i} className="border-b last:border-b-0 border-border p-6 md:p-8">
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-3">{item.level}</p>
                <p className={item.style}>{item.text}</p>
                <p className="text-xs text-muted-foreground mt-3 font-mono">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 6 — Mise en page type */}
        <section>
          <h2 className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-8 border-b border-border pb-3">
            06 — Mise en page type (simulation)
          </h2>
          <div className="bg-[#1a1a1a] rounded-xl overflow-hidden">
            {/* Simulated hero */}
            <div className="aspect-[16/7] bg-gradient-to-b from-[#3a3028] to-[#1a1a1a] flex items-center justify-center relative">
              <div className="text-center space-y-4">
                <p className="text-white/40 text-xs tracking-[0.3em] uppercase">Marrakech</p>
                <p className="text-white text-4xl md:text-6xl font-light tracking-[0.2em] uppercase">
                  Maison Brummell
                </p>
                <p className="text-white/50 text-xs tracking-[0.25em] uppercase">Majorelle</p>
              </div>
            </div>
            {/* Simulated content */}
            <div className="px-8 md:px-16 py-12 md:py-16 max-w-3xl mx-auto">
              <p className="text-[#e8e0d6] font-serif text-xl italic leading-relaxed mb-8">
                « Nichée dans les jardins de Majorelle, Maison Brummell est un sanctuaire de sérénité où chaque espace raconte une histoire. »
              </p>
              <p className="text-[#e8e0d6]/60 font-serif text-base leading-[1.8]">
                Avec seulement sept suites, cet hôtel-boutique offre une intimité rare au cœur de Marrakech. Les espaces communs — patio, piscine, jardin — sont conçus comme des extensions naturelles de chaque chambre, brouillant la frontière entre intérieur et extérieur.
              </p>
              <div className="mt-10 pt-8 border-t border-white/10">
                <button className="border border-[#c4a265] text-[#c4a265] text-xs tracking-[0.25em] uppercase py-3 px-10 hover:bg-[#c4a265] hover:text-[#1a1a1a] transition-colors">
                  Réserver
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 7 — Comparaison */}
        <section>
          <h2 className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-8 border-b border-border pb-3">
            07 — Équivalences Google Fonts
          </h2>
          <p className="text-sm text-foreground/70 mb-6">
            Venus et Freight ne sont pas disponibles sur Google Fonts. Voici les alternatives les plus proches :
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-border rounded-lg p-8 space-y-4">
              <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">Remplacement de Venus (titres)</p>
              <div className="space-y-3">
                <div>
                  <p className="font-['Montserrat'] text-2xl tracking-[0.15em] uppercase font-light">Montserrat</p>
                  <p className="text-xs text-muted-foreground mt-1">Géométrique, élégante, similar tracking</p>
                </div>
                <div>
                  <p className="font-['Didact_Gothic'] text-2xl tracking-[0.15em] uppercase">Didact Gothic</p>
                  <p className="text-xs text-muted-foreground mt-1">Minimaliste, propre, espace naturel</p>
                </div>
                <div>
                  <p className="font-['Poiret_One'] text-2xl tracking-[0.15em] uppercase">Poiret One</p>
                  <p className="text-xs text-muted-foreground mt-1">Art déco, très fine, géométrique</p>
                </div>
              </div>
            </div>
            <div className="border border-border rounded-lg p-8 space-y-4">
              <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">Remplacement de Freight (corps)</p>
              <div className="space-y-3">
                <div>
                  <p className="font-['Libre_Baskerville'] text-lg italic">Libre Baskerville</p>
                  <p className="text-xs text-muted-foreground mt-1">Serif classique, excellent en italique</p>
                </div>
                <div>
                  <p className="font-['Cormorant_Garamond'] text-lg italic">Cormorant Garamond</p>
                  <p className="text-xs text-muted-foreground mt-1">Élégant, éditorial, display serif</p>
                </div>
                <div>
                  <p className="font-['Playfair_Display'] text-lg italic">Playfair Display</p>
                  <p className="text-xs text-muted-foreground mt-1">Luxueux, fort contraste, iconique</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 8 — CSS recap */}
        <section>
          <h2 className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-8 border-b border-border pb-3">
            08 — Récapitulatif CSS
          </h2>
          <div className="bg-[#1a1a1a] rounded-xl p-8 overflow-x-auto">
            <pre className="text-[#e8e0d6]/80 text-sm font-mono leading-relaxed whitespace-pre">
{`/* ─── Venus — Titres & Navigation ─── */
.heading-hero {
  font-family: 'Venus', 'Montserrat', sans-serif;
  font-weight: 300;
  text-transform: uppercase;
  letter-spacing: 0.25em;
  font-size: clamp(2.5rem, 5vw, 5rem);
}

.heading-section {
  font-family: 'Venus', 'Montserrat', sans-serif;
  font-weight: 300;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-size: clamp(1.8rem, 3vw, 3rem);
}

.nav-link, .btn-label {
  font-family: 'Venus', 'Montserrat', sans-serif;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.75rem;
}

/* ─── Freight — Corps & Citations ─── */
.body-text {
  font-family: 'Freight Text', 'Libre Baskerville', serif;
  font-weight: 400;
  font-size: 1rem;
  line-height: 1.8;
}

.pull-quote {
  font-family: 'Freight Display', 'Cormorant Garamond', serif;
  font-weight: 400;
  font-style: italic;
  font-size: clamp(1.25rem, 2vw, 1.75rem);
  line-height: 1.5;
}

/* ─── Palette ─── */
:root {
  --brummell-black: #1a1a1a;
  --brummell-cream: #f5f0eb;
  --brummell-gold: #c4a265;
  --brummell-grey: #8a8078;
  --brummell-terracotta: #b5836a;
}`}
            </pre>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default BlogBrummellTypography;
