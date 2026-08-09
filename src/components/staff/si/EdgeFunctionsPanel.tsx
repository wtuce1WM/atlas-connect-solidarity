import { useMemo, useState } from "react";
import { SI_EDGE_FUNCTIONS } from "@/data/siEdgeFunctions";
import { Search, Sparkles, KeyRound, Globe, Database, Unlock } from "lucide-react";

/** Cartographie des edge functions : tables lues/écrites, RPC, secrets, appels externes. */
const EdgeFunctionsPanel = () => {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "ai" | "public" | "svc" | "ext">("all");
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return SI_EDGE_FUNCTIONS.filter((f) => {
      if (s && !f.name.includes(s) && !f.tables.some((t) => t.includes(s)) && !f.secrets.some((x) => x.toLowerCase().includes(s))) return false;
      if (filter === "ai") return f.ai;
      if (filter === "public") return !f.verify_jwt;
      if (filter === "svc") return f.service_role;
      if (filter === "ext") return f.ext.length > 0;
      return true;
    });
  }, [q, filter]);

  const chips: { k: typeof filter; label: string; n: number }[] = [
    { k: "all", label: "Toutes", n: SI_EDGE_FUNCTIONS.length },
    { k: "ai", label: "IA (Gateway)", n: SI_EDGE_FUNCTIONS.filter((f) => f.ai).length },
    { k: "public", label: "Sans JWT", n: SI_EDGE_FUNCTIONS.filter((f) => !f.verify_jwt).length },
    { k: "svc", label: "service_role", n: SI_EDGE_FUNCTIONS.filter((f) => f.service_role).length },
    { k: "ext", label: "API externes", n: SI_EDGE_FUNCTIONS.filter((f) => f.ext.length > 0).length },
  ];

  return (
    <div className="h-full overflow-auto p-4 text-foreground">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="fonction, table, secret…" className="h-8 pl-8 pr-3 rounded-md border border-border bg-background text-xs w-60" />
        </div>
        {chips.map((c) => (
          <button key={c.k} onClick={() => setFilter(c.k)} className={`h-8 px-3 rounded-full border text-xs font-semibold ${filter === c.k ? "bg-foreground text-background border-foreground" : "border-border"}`}>
            {c.label} <span className="opacity-60">{c.n}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {list.map((f) => (
          <div key={f.name} className="rounded-lg border border-border bg-background p-3 text-xs">
            <button onClick={() => setOpen(open === f.name ? null : f.name)} className="w-full text-left">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono font-bold text-sm">{f.name}</span>
                {f.ai && <Sparkles className="h-3.5 w-3.5 text-gold" title="Lovable AI Gateway" />}
                {!f.verify_jwt && <Unlock className="h-3.5 w-3.5 text-amber-500" title="Publique (verify_jwt = false)" />}
                {f.service_role && <KeyRound className="h-3.5 w-3.5 text-destructive" title="Utilise service_role" />}
                {f.ext.length > 0 && <Globe className="h-3.5 w-3.5 text-sky-500" title={f.ext.join(", ")} />}
              </div>
              <div className="mt-1 flex items-center gap-3 text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Database className="h-3 w-3" /> {f.tables.length} tables</span>
                <span>{f.writes.length} écritures</span>
                <span>{f.lines} lignes</span>
              </div>
            </button>

            {open === f.name && (
              <div className="mt-2 pt-2 border-t border-border flex flex-col gap-1.5">
                {f.tables.length > 0 && (
                  <div>
                    <div className="font-semibold uppercase text-[10px] text-muted-foreground">Tables</div>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {f.tables.map((t) => (
                        <span key={t} className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${f.writes.includes(t) ? "bg-primary/15 text-primary font-bold" : "bg-muted"}`}>
                          {t}{f.writes.includes(t) ? " ✎" : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {f.rpc.length > 0 && (
                  <div><span className="font-semibold uppercase text-[10px] text-muted-foreground">RPC</span> <span className="font-mono">{f.rpc.join(", ")}</span></div>
                )}
                {f.secrets.length > 0 && (
                  <div><span className="font-semibold uppercase text-[10px] text-muted-foreground">Secrets</span> <span className="font-mono">{f.secrets.join(", ")}</span></div>
                )}
                {f.ext.length > 0 && (
                  <div><span className="font-semibold uppercase text-[10px] text-muted-foreground">Hôtes externes</span> <span className="font-mono">{f.ext.join(", ")}</span></div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">
        Scan statique du code des fonctions (appels <code>.from()</code>, <code>.rpc()</code>, <code>Deno.env.get()</code>, <code>fetch()</code>). ✎ = table écrite.
      </p>
    </div>
  );
};

export default EdgeFunctionsPanel;
