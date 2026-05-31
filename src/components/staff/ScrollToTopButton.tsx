import { useState, useEffect } from "react";
import { ArrowUp, ArrowDown, HelpCircle, X } from "lucide-react";

export const helpContent = `
## Polices du site

| Élément | Police | Style |
|---|---|---|
| \`body\` | Roboto (sans-serif) | 400, line-height 1.8 |
| \`h1, h2, h3\` | Roboto (sans-serif) | 500 |
| \`nav, button, .font-venus\` | Josefin Sans (sans-serif) | 300, uppercase, tracking 0.12em |
| \`.font-arabic\` | Amiri | 400, 700 |

## Classes Tailwind — Tailles de police

| Classe | Taille réelle |
|---|---|
| \`text-xs\` | 12px (0.75rem) |
| \`text-sm\` | 14px (0.875rem) |
| \`text-base\` | 16px (1rem) |
| \`text-lg\` | 18px (1.125rem) |
| \`text-xl\` | 20px (1.25rem) |
| \`text-2xl\` | 24px (1.5rem) |
| \`text-3xl\` | 30px (1.875rem) |
| \`text-4xl\` | 36px (2.25rem) |
| \`text-5xl\` | 48px (3rem) |

## Graisses

| Classe | Poids CSS |
|---|---|
| \`font-light\` | 300 |
| \`font-normal\` | 400 |
| \`font-medium\` | 500 |
| \`font-semibold\` | 600 |
| \`font-bold\` | 700 |

## Exemples courants

- \`text-2xl font-bold\` → **24px, gras (700)**
- \`text-sm font-medium\` → **14px, medium (500)**
- \`text-xs font-semibold\` → **12px, semi-gras (600)**
- \`text-lg font-light\` → **18px, light (300)**
`;

/** Render `code` segments in text */
export function renderInlineCode(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((p, i) =>
    p.startsWith("`") && p.endsWith("`")
      ? <code key={i} className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{p.slice(1, -1)}</code>
      : <span key={i}>{p}</span>
  );
}

/** Extract markdown tables and render them as HTML */
export function renderTables(md: string) {
  const sections = md.split(/^## /m).filter(Boolean);
  return sections.map((section, si) => {
    const lines = section.split("\n");
    const tableLines = lines.filter(l => l.startsWith("|"));
    if (tableLines.length < 3) return null;

    const headerCells = tableLines[0].split("|").filter(Boolean).map(c => c.trim());
    const dataRows = tableLines.slice(2);

    return (
      <table key={si} className="w-full mb-4">
        <thead>
          <tr className="border-b">
            {headerCells.map((h, i) => (
              <th key={i} className="text-left py-2 pr-4 font-medium text-muted-foreground text-xs">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {dataRows.map((row, ri) => {
            const cells = row.split("|").filter(Boolean).map(c => c.trim());
            return (
              <tr key={ri}>
                {cells.map((cell, ci) => (
                  <td key={ci} className="py-1.5 pr-4 text-sm">{renderInlineCode(cell)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  });
}

/** Color swatches data */
const colorTokens = [
  { token: "text-foreground", label: "Texte principal", className: "text-foreground" },
  { token: "text-muted-foreground", label: "Texte secondaire / atténué", className: "text-muted-foreground" },
  { token: "text-primary", label: "Terracotta", className: "text-primary" },
  { token: "text-secondary", label: "Majorelle Blue", className: "text-secondary" },
  { token: "text-gold", label: "Or / Gold accent", className: "text-gold" },
  { token: "text-atlas", label: "Atlas Green", className: "text-atlas" },
  { token: "text-destructive", label: "Erreur / destructif", className: "text-destructive" },
];

/** Reusable help content panel (inline, no overlay) */
export const HelpContentPanel = () => (
  <div className="prose prose-sm max-w-none text-foreground [&_table]:w-full [&_th]:text-left [&_th]:py-2 [&_th]:pr-4 [&_th]:font-medium [&_th]:text-muted-foreground [&_th]:border-b [&_td]:py-1.5 [&_td]:pr-4 [&_td]:text-sm [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_li]:text-sm [&_strong]:text-foreground">
    {helpContent.split("\n").map((line, i) => {
      if (line.startsWith("## ")) return <h2 key={i}>{line.slice(3)}</h2>;
      if (line.startsWith("- ")) {
        const text = line.slice(2);
        return <p key={i} className="ml-3 my-1 text-sm">{renderInlineCode(text)}</p>;
      }
      return null;
    })}
    {renderTables(helpContent)}

    {/* Color tokens with live preview */}
    <h2>Couleurs de texte (tokens sémantiques)</h2>
    <div className="space-y-2 not-prose">
      {colorTokens.map((c) => (
        <div key={c.token} className="flex items-center gap-4 py-2 px-3 rounded-lg bg-muted/40 border border-border/50">
          <code className="bg-muted px-2 py-1 rounded text-xs font-mono text-foreground min-w-[180px]">{c.token}</code>
          <span className={`text-base font-semibold ${c.className}`}>{c.label} — Marrakech</span>
        </div>
      ))}
    </div>

    {/* Link to typography page */}
    <div className="mt-6 pt-4 border-t border-border not-prose">
      <a
        href="https://atlas-connect-solidarity.lovable.app/blog/typographie"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
      >
        Voir le guide typographique complet ↗
      </a>
    </div>
  </div>
);

const ScrollToTopButton = () => {
  const [visible, setVisible] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible && !helpOpen) return null;

  return (
    <>
      {visible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
          <button
            onClick={() => setHelpOpen(o => !o)}
            className="p-3 rounded-full bg-muted text-muted-foreground shadow-lg hover:bg-muted/80 transition-all border border-border"
            aria-label="Aide design system"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all"
            aria-label="Remonter en haut"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      )}

      {helpOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setHelpOpen(false)}>
          <div
            className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl p-6 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setHelpOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              aria-label="Fermer l'aide"
            >
              <X className="h-4 w-4" />
            </button>
            <HelpContentPanel />
          </div>
        </div>
      )}
    </>
  );
};

export default ScrollToTopButton;
