import { Database } from "lucide-react";

const StaffERDPanel = () => {
  return (
    <div className="w-full h-[calc(100vh-180px)] min-h-[600px] bg-white rounded-lg border border-border overflow-hidden">
      <div className="bg-foreground text-background px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-gold" />
          <span className="font-semibold text-sm">Schéma de base de données — ERD interactif</span>
        </div>
        <div className="text-xs text-background/60">
          154 tables · 168 relations · recherche + focus + zoom
        </div>
      </div>
      <iframe
        src="/erd-interactif.html"
        title="ERD interactif One World Morocco"
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};

export default StaffERDPanel;
