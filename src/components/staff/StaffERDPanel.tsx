import { useState } from "react";
import { Database, Network } from "lucide-react";

type Tab = "graph" | "diagrams";

const StaffERDPanel = () => {
  const [tab, setTab] = useState<Tab>("graph");

  const tabs: { key: Tab; label: string; hint: string }[] = [
    { key: "graph", label: "ERD interactif", hint: "154 tables · 168 relations · recherche + focus + zoom" },
    { key: "diagrams", label: "Diagrammes SVG", hint: "Par domaine · zoom/pan · téléchargement SVG" },
  ];

  const active = tabs.find((t) => t.key === tab)!;

  return (
    <div className="w-full h-[calc(100vh-180px)] min-h-[600px] bg-white rounded-lg border border-border overflow-hidden flex flex-col">
      <div className="bg-foreground text-background px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {tab === "graph" ? <Database className="h-4 w-4 text-gold" /> : <Network className="h-4 w-4 text-gold" />}
          <span className="font-semibold text-sm">Schéma de base de données</span>
          <div className="flex items-center gap-1.5 ml-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  tab === t.key
                    ? "bg-background text-foreground border-background"
                    : "bg-background/10 text-background/80 border-background/20 hover:bg-background/20"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="text-xs text-background/60">{active.hint}</div>
      </div>
      <iframe
        key={tab}
        src={tab === "graph" ? "/erd-interactif.html" : "/erd-diagrammes.html"}
        title={tab === "graph" ? "ERD interactif One World Morocco" : "Diagrammes ERD par domaine"}
        className="w-full flex-1 border-0"
        sandbox="allow-scripts allow-same-origin allow-downloads"
      />
    </div>
  );
};

export default StaffERDPanel;
