import { useState, useEffect, useRef } from "react";
import { Sparkles, RefreshCw, Play } from "lucide-react";

const DEMO_TEXT = `Voici nos meilleures recommandations pour déguster un **steak frites à Marrakech**. Le **Café des Épices** propose une version revisitée avec des épices locales, tandis que **Le Comptoir Darna** offre une ambiance festive et une cuisine française raffinée. Pour une expérience plus décontractée, **Grand Café de la Poste** est un incontournable avec son cadre colonial élégant.`;

const LINES = [
  "Voici nos meilleures recommandations pour déguster un **steak frites à Marrakech**.",
  "Le **Café des Épices** propose une version revisitée avec des épices locales.",
  "**Le Comptoir Darna** offre une ambiance festive et une cuisine française raffinée.",
  "Pour une expérience décontractée, **Grand Café de la Poste** est un incontournable."
];

const parseBold = (text: string) => {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((p, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold text-foreground underline decoration-gold/40 underline-offset-2">{p}</strong>
      : <span key={i}>{p}</span>
  );
};

/* ─── Effect 1: Typewriter ─── */
const TypewriterEffect = ({ text, active }: { text: string; active: boolean }) => {
  const [displayed, setDisplayed] = useState("");
  const plain = text.replace(/\*\*/g, "");

  useEffect(() => {
    if (!active) { setDisplayed(""); return; }
    setDisplayed("");
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(plain.slice(0, i));
      if (i >= plain.length) clearInterval(iv);
    }, 18);
    return () => clearInterval(iv);
  }, [active, plain]);

  if (!active && !displayed) return null;

  return (
    <div className="leading-relaxed text-sm text-foreground">
      {displayed}
      {displayed.length < plain.length && (
        <span className="inline-block w-[2px] h-[1.1em] bg-gold ml-0.5 animate-pulse align-text-bottom" />
      )}
    </div>
  );
};

/* ─── Effect 2: Line Reveal with Gold Glow ─── */
const LineRevealEffect = ({ lines, active }: { lines: string[]; active: boolean }) => {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!active) { setVisibleCount(0); return; }
    setVisibleCount(0);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= lines.length) clearInterval(iv);
    }, 600);
    return () => clearInterval(iv);
  }, [active, lines.length]);

  return (
    <div className="space-y-2 text-sm leading-relaxed text-foreground">
      {lines.map((line, idx) => (
        <p
          key={idx}
          className="transition-all duration-700 ease-out"
          style={{
            opacity: idx < visibleCount ? 1 : 0,
            transform: idx < visibleCount ? "translateY(0)" : "translateY(12px)",
            textShadow: idx === visibleCount - 1 ? "0 0 20px hsl(var(--gold) / 0.5), 0 0 40px hsl(var(--gold) / 0.2)" : "none",
            transitionDelay: `${idx * 50}ms`,
          }}
        >
          {parseBold(line)}
        </p>
      ))}
    </div>
  );
};

/* ─── Effect 3: Word by Word Fade ─── */
const WordFadeEffect = ({ text, active }: { text: string; active: boolean }) => {
  const plain = text.replace(/\*\*/g, "");
  const words = plain.split(/\s+/);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!active) { setVisibleCount(0); return; }
    setVisibleCount(0);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= words.length) clearInterval(iv);
    }, 60);
    return () => clearInterval(iv);
  }, [active, words.length]);

  return (
    <div className="text-sm leading-relaxed text-foreground flex flex-wrap gap-x-1.5 gap-y-1">
      {words.map((word, idx) => (
        <span
          key={idx}
          className="transition-all duration-300 ease-out inline-block"
          style={{
            opacity: idx < visibleCount ? 1 : 0,
            transform: idx < visibleCount ? "translateY(0) scale(1)" : "translateY(8px) scale(0.95)",
            filter: idx < visibleCount ? "blur(0px)" : "blur(4px)",
          }}
        >
          {word}
        </span>
      ))}
    </div>
  );
};

/* ─── Effect 4: Expand + Shimmer ─── */
const ExpandShimmerEffect = ({ text, active }: { text: string; active: boolean }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) { setShow(false); return; }
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div
      className="overflow-hidden transition-all duration-700 ease-out"
      style={{
        maxHeight: show ? "300px" : "0px",
        opacity: show ? 1 : 0,
      }}
    >
      <div className="relative text-sm leading-relaxed text-foreground">
        {parseBold(text)}
        {show && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent 0%, hsl(var(--gold) / 0.15) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmerSweep 2s ease-in-out 0.3s forwards",
            }}
          />
        )}
      </div>
    </div>
  );
};

/* ─── Demo Page ─── */
const AIEffectsDemo = () => {
  const [activeEffects, setActiveEffects] = useState<Record<number, number>>({});

  const trigger = (idx: number) => {
    setActiveEffects(prev => ({ ...prev, [idx]: (prev[idx] || 0) + 1 }));
  };

  const resetAll = () => {
    setActiveEffects({});
    setTimeout(() => {
      setActiveEffects({ 0: 1, 1: 1, 2: 1, 3: 1 });
    }, 100);
  };

  useEffect(() => {
    // Auto-trigger all on mount
    const t = setTimeout(() => {
      setActiveEffects({ 0: 1, 1: 1, 2: 1, 3: 1 });
    }, 500);
    return () => clearTimeout(t);
  }, []);

  const effects = [
    { title: "1 · Typewriter (machine à écrire)", desc: "Texte tapé lettre par lettre avec curseur clignotant" },
    { title: "2 · Reveal par ligne + glow doré", desc: "Chaque phrase glisse depuis le bas avec un halo lumineux" },
    { title: "3 · Fondu mot par mot", desc: "Les mots apparaissent progressivement avec un fondu" },
    { title: "4 · Expansion fluide + shimmer", desc: "La zone s'expand et un éclat doré balaie le texte" },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <style>{`
        @keyframes shimmerSweep {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-gold" />
            Effets CSS — Texte IA
          </h1>
          <p className="text-muted-foreground text-sm">Cliquez sur chaque carte pour relancer l'animation</p>
          <button
            onClick={resetAll}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/30 text-sm text-foreground hover:bg-gold/20 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Tout relancer
          </button>
        </div>

        {effects.map((effect, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/5 to-background overflow-hidden cursor-pointer hover:border-gold/50 transition-colors"
            onClick={() => trigger(idx)}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gold/15">
              <div>
                <h2 className="text-sm font-semibold text-foreground">{effect.title}</h2>
                <p className="text-xs text-muted-foreground">{effect.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Suggestion IA</span>
              </div>
            </div>
            <div className="px-5 py-4 min-h-[120px]">
              {idx === 0 && <TypewriterEffect text={DEMO_TEXT} active={!!activeEffects[0]} key={activeEffects[0]} />}
              {idx === 1 && <LineRevealEffect lines={LINES} active={!!activeEffects[1]} key={activeEffects[1]} />}
              {idx === 2 && <WordFadeEffect text={DEMO_TEXT} active={!!activeEffects[2]} key={activeEffects[2]} />}
              {idx === 3 && <ExpandShimmerEffect text={DEMO_TEXT} active={!!activeEffects[3]} key={activeEffects[3]} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIEffectsDemo;
