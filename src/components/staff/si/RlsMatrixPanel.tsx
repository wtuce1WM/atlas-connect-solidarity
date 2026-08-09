import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader, ShieldAlert, ShieldCheck, Search } from "lucide-react";

interface Policy { n: string; c: string; r: string; u: string; w: string }
interface Row {
  t: string;
  rls: boolean;
  forced: boolean;
  anon: string | null;
  auth: string | null;
  svc: string | null;
  pol: Policy[] | null;
}

const privBadge = (v: string | null) => {
  if (!v) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex gap-1 flex-wrap">
      {v.split(",").map((p) => (
        <span key={p} className="px-1.5 py-0.5 rounded bg-muted text-[10px] uppercase font-semibold">
          {p.slice(0, 3)}
        </span>
      ))}
    </span>
  );
};

/** Matrice RLS / GRANT par table (lecture live via RPC staff_rls_matrix). */
const RlsMatrixPanel = () => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [risky, setRisky] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any).rpc("staff_rls_matrix");
      if (error) setErr(error.message);
      else setRows((data as Row[]) || []);
    })();
  }, []);

  const isRisky = (r: Row) =>
    !r.rls ||
    (r.pol?.length || 0) === 0 ||
    !!(r.anon || "").match(/insert|update|delete/) ||
    !!r.pol?.some((p) => (p.u === "true" || p.w === "true") && p.c !== "SELECT");

  const filtered = useMemo(() => {
    if (!rows) return [];
    const s = q.trim().toLowerCase();
    return rows.filter(
      (r) => (!s || r.t.includes(s) || r.pol?.some((p) => p.n.toLowerCase().includes(s))) && (!risky || isRisky(r))
    );
  }, [rows, q, risky]);

  if (err) return <div className="p-6 text-sm text-destructive">Erreur : {err}</div>;
  if (!rows) return <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader className="h-4 w-4 animate-spin" /> Chargement de la matrice…</div>;

  return (
    <div className="h-full overflow-auto p-4 text-foreground">
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="table ou policy…"
            className="h-8 pl-8 pr-3 rounded-md border border-border bg-background text-xs w-56"
          />
        </div>
        <button
          onClick={() => setRisky((v) => !v)}
          className={`h-8 px-3 rounded-md border text-xs font-semibold ${risky ? "bg-destructive text-destructive-foreground border-destructive" : "border-border"}`}
        >
          À surveiller ({rows.filter(isRisky).length})
        </button>
        <span className="text-xs text-muted-foreground">{filtered.length} / {rows.length} tables</span>
      </div>

      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 bg-background">
          <tr className="text-left border-b border-border">
            <th className="py-2 pr-2">Table</th>
            <th className="py-2 pr-2">RLS</th>
            <th className="py-2 pr-2">anon</th>
            <th className="py-2 pr-2">authenticated</th>
            <th className="py-2 pr-2">service_role</th>
            <th className="py-2 pr-2">Policies</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <>
              <tr
                key={r.t}
                onClick={() => setOpen(open === r.t ? null : r.t)}
                className={`border-b border-border/50 cursor-pointer hover:bg-muted/50 ${isRisky(r) ? "bg-destructive/5" : ""}`}
              >
                <td className="py-1.5 pr-2 font-mono">{r.t}</td>
                <td className="py-1.5 pr-2">
                  {r.rls ? <ShieldCheck className="h-4 w-4 text-emerald-500" /> : <ShieldAlert className="h-4 w-4 text-destructive" />}
                </td>
                <td className="py-1.5 pr-2">{privBadge(r.anon)}</td>
                <td className="py-1.5 pr-2">{privBadge(r.auth)}</td>
                <td className="py-1.5 pr-2">{privBadge(r.svc)}</td>
                <td className="py-1.5 pr-2 font-semibold">{r.pol?.length || 0}</td>
              </tr>
              {open === r.t && (
                <tr key={`${r.t}-d`} className="bg-muted/30">
                  <td colSpan={6} className="p-3">
                    {(r.pol || []).length === 0 ? (
                      <div className="text-destructive font-semibold">Aucune policy — table verrouillée (ou exposée si RLS off).</div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {r.pol!.map((p) => (
                          <div key={p.n} className="rounded-md border border-border bg-background p-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold">{p.c}</span>
                              <span className="font-semibold">{p.n}</span>
                              <span className="text-muted-foreground">rôles : {p.r || "public"}</span>
                            </div>
                            {p.u && <pre className="mt-1 whitespace-pre-wrap font-mono text-[10px] text-muted-foreground">USING {p.u}</pre>}
                            {p.w && <pre className="mt-1 whitespace-pre-wrap font-mono text-[10px] text-muted-foreground">CHECK {p.w}</pre>}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RlsMatrixPanel;
