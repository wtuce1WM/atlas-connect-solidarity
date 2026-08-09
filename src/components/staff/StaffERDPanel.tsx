import { useState } from "react";
import { Database, Network, Shield, Cloud, Route, MousePointerClick, Tags, BarChart3 } from "lucide-react";
import RlsMatrixPanel from "@/components/staff/si/RlsMatrixPanel";
import EdgeFunctionsPanel from "@/components/staff/si/EdgeFunctionsPanel";
import RoutesMapPanel from "@/components/staff/si/RoutesMapPanel";
import CtaFlowPanel from "@/components/staff/si/CtaFlowPanel";
import TaxonomyPanel from "@/components/staff/si/TaxonomyPanel";
import AnalyticsFlowPanel from "@/components/staff/si/AnalyticsFlowPanel";

type Tab = "graph" | "diagrams" | "rls" | "functions" | "routes" | "cta" | "taxonomy" | "analytics";

const TABS: { key: Tab; label: string; hint: string; icon: typeof Database }[] = [
  { key: "graph", label: "ERD interactif", hint: "154 tables · 168 relations · recherche + focus + zoom", icon: Database },
  { key: "diagrams", label: "Diagrammes SVG", hint: "Par domaine · zoom/pan · téléchargement SVG", icon: Network },
  { key: "rls", label: "Matrice RLS", hint: "RLS, GRANT anon/authenticated/service_role et policies par table", icon: Shield },
  { key: "functions", label: "Edge functions", hint: "Tables lues/écrites, RPC, secrets, API externes, JWT", icon: Cloud },
  { key: "routes", label: "Routes front", hint: "Toutes les routes par zone d'accès et composant cible", icon: Route },
  { key: "cta", label: "Flux CTA & widgets", hint: "Résolution url 1→5, widgets par intention, autorité de réservation", icon: MousePointerClick },
  { key: "taxonomy", label: "Taxonomie", hint: "Structure du Front → sous-catégories, badges, services", icon: Tags },
  { key: "analytics", label: "Analytics", hint: "Collecte d'événements → agrégations SQL → dashboards", icon: BarChart3 },
];

const StaffERDPanel = () => {
  const [tab, setTab] = useState<Tab>("graph");
  const active = TABS.find((t) => t.key === tab)!;
  const Icon = active.icon;
  const isIframe = tab === "graph" || tab === "diagrams";

  return (
    <div className="w-full h-[calc(100vh-180px)] min-h-[600px] bg-background rounded-lg border border-border overflow-hidden flex flex-col">
      <div className="bg-foreground text-background px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Icon className="h-4 w-4 text-gold" />
          <span className="font-semibold text-sm">Schéma & cartographie du SI</span>
          <div className="flex items-center gap-1.5 ml-2 flex-wrap">
            {TABS.map((t) => (
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

      {isIframe ? (
        <iframe
          key={tab}
          src={tab === "graph" ? "/erd-interactif.html" : "/erd-diagrammes.html"}
          title={tab === "graph" ? "ERD interactif One World Morocco" : "Diagrammes ERD par domaine"}
          className="w-full flex-1 border-0 bg-white"
          sandbox="allow-scripts allow-same-origin allow-downloads"
        />
      ) : (
        <div className="flex-1 min-h-0">
          {tab === "rls" && <RlsMatrixPanel />}
          {tab === "functions" && <EdgeFunctionsPanel />}
          {tab === "routes" && <RoutesMapPanel />}
          {tab === "cta" && <CtaFlowPanel />}
          {tab === "taxonomy" && <TaxonomyPanel />}
          {tab === "analytics" && <AnalyticsFlowPanel />}
        </div>
      )}
    </div>
  );
};

export default StaffERDPanel;
