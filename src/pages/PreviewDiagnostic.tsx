import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw, Copy } from "lucide-react";

type Status = "pending" | "running" | "ok" | "warn" | "fail";

type Check = {
  id: string;
  label: string;
  group: string;
  status: Status;
  detail?: string;
  ms?: number;
};

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const StatusIcon = ({ status }: { status: Status }) => {
  if (status === "running") return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-primary" />;
  if (status === "warn") return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
  if (status === "fail") return <XCircle className="h-4 w-4 text-destructive" />;
  return <span className="h-4 w-4 rounded-full border border-border inline-block" />;
};

export default function PreviewDiagnostic() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);
  const errorsRef = useRef<string[]>([]);
  const [errorCount, setErrorCount] = useState(0);

  // Capture des erreurs runtime pendant la session de diagnostic
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      errorsRef.current.push(`${e.message} @ ${e.filename}:${e.lineno}`);
      setErrorCount(errorsRef.current.length);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      errorsRef.current.push(`unhandled rejection: ${String(e.reason)}`);
      setErrorCount(errorsRef.current.length);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  const upsert = useCallback((c: Check) => {
    setChecks((prev) => {
      const i = prev.findIndex((p) => p.id === c.id);
      if (i === -1) return [...prev, c];
      const next = [...prev];
      next[i] = { ...next[i], ...c };
      return next;
    });
  }, []);

  const timed = useCallback(
    async (
      id: string,
      group: string,
      label: string,
      fn: () => Promise<{ status: Status; detail?: string }>,
    ) => {
      upsert({ id, group, label, status: "running" });
      const t0 = performance.now();
      try {
        const res = await fn();
        upsert({ id, group, label, ...res, ms: Math.round(performance.now() - t0) });
      } catch (e) {
        upsert({
          id,
          group,
          label,
          status: "fail",
          detail: e instanceof Error ? e.message : String(e),
          ms: Math.round(performance.now() - t0),
        });
      }
    },
    [upsert],
  );

  const pingFunction = useCallback(
    async (path: string) => {
      const res = await fetch(`${FUNCTIONS_BASE}/${path}`, {
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      });
      const text = await res.text();
      if (!res.ok) return { status: "fail" as Status, detail: `HTTP ${res.status} — ${text.slice(0, 140)}` };
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        return { status: "warn" as Status, detail: `200 mais réponse non-JSON (${text.length} octets)` };
      }
      const size = text.length;
      const keys = parsed && typeof parsed === "object" ? Object.keys(parsed as object).slice(0, 5).join(", ") : "";
      return { status: "ok" as Status, detail: `200 — ${size} octets${keys ? ` — clés: ${keys}` : ""}` };
    },
    [],
  );

  const countTable = useCallback(async (table: string, filter?: (q: any) => any) => {
    let q = supabase.from(table as never).select("*", { count: "exact", head: true });
    if (filter) q = filter(q);
    const { count, error } = await q;
    if (error) return { status: "fail" as Status, detail: error.message };
    if (!count) return { status: "warn" as Status, detail: "0 ligne lisible (RLS ou table vide)" };
    return { status: "ok" as Status, detail: `${count} lignes lisibles` };
  }, []);

  const runAll = useCallback(async () => {
    setRunning(true);
    setChecks([]);
    errorsRef.current = [];
    setErrorCount(0);

    // 1. Contexte
    await timed("ctx-iframe", "Contexte preview", "Rendu dans une iframe", async () => {
      const inIframe = window.self !== window.top;
      return {
        status: "ok",
        detail: inIframe ? "Oui (preview Lovable / embed)" : "Non (onglet plein écran)",
      };
    });
    await timed("ctx-route", "Contexte preview", "Route & host", async () => ({
      status: "ok",
      detail: `${window.location.host}${window.location.pathname}${window.location.search}`,
    }));
    await timed("ctx-viewport", "Contexte preview", "Viewport & densité", async () => {
      const w = window.innerWidth;
      return {
        status: w < 320 ? "warn" : "ok",
        detail: `${w}×${window.innerHeight} px — dpr ${window.devicePixelRatio}`,
      };
    });
    await timed("ctx-storage", "Contexte preview", "Persistence de route (sessionStorage)", async () => {
      try {
        const key = "__owm_preview_route__";
        const saved = sessionStorage.getItem(key);
        sessionStorage.setItem("owm:diagPing", "1");
        sessionStorage.removeItem("owm:diagPing");
        return { status: "ok", detail: saved ? `dernière route mémorisée : ${saved}` : "accessible, aucune route mémorisée" };
      } catch (e) {
        return { status: "warn", detail: "sessionStorage bloqué (iframe cross-origin ?)" };
      }
    });

    // 2. Edge functions publiques
    await timed("fn-tides", "Edge functions", "tides (liste des villes)", () => pingFunction("tides?list=1"));
    await timed("fn-tides-data", "Edge functions", "tides (Essaouira, 3 jours)", () =>
      pingFunction("tides?city=Essaouira&days=3&lang=fr"),
    );
    await timed("fn-weather", "Edge functions", "weather (Marrakech)", () =>
      pingFunction("weather?city=Marrakech&lang=fr"),
    );
    await timed("fn-get-weather", "Edge functions", "get-weather (7 jours)", () =>
      pingFunction("get-weather?city=Essaouira&days=7&lang=fr"),
    );

    // 3. Base de données (lecture anon)
    await timed("db-cities", "Base de données", "Table cities", () => countTable("cities"));
    await timed("db-businesses", "Base de données", "Établissements actifs", () =>
      countTable("businesses", (q) => q.eq("is_active", true)),
    );
    await timed("db-blog", "Base de données", "Articles de blog publiés", () =>
      countTable("blog_posts", (q) => q.eq("is_published", true)),
    );
    await timed("db-auth", "Base de données", "Session auth", async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) return { status: "fail", detail: error.message };
      return data.session
        ? { status: "ok", detail: `connecté : ${data.session.user.email ?? data.session.user.id}` }
        : { status: "warn", detail: "aucune session (visiteur anonyme)" };
    });

    // 4. Assets & performance
    await timed("perf-load", "Assets & perf", "Temps de chargement de la page", async () => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (!nav) return { status: "warn", detail: "timing indisponible" };
      const total = Math.round(nav.duration);
      return { status: total > 6000 ? "warn" : "ok", detail: `${total} ms (DOM ${Math.round(nav.domContentLoadedEventEnd)} ms)` };
    });
    await timed("perf-resources", "Assets & perf", "Ressources chargées", async () => {
      const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const bytes = res.reduce((a, r) => a + (r.transferSize || 0), 0);
      const slow = res.filter((r) => r.duration > 3000).length;
      return {
        status: slow > 0 ? "warn" : "ok",
        detail: `${res.length} requêtes — ${(bytes / 1024 / 1024).toFixed(2)} Mo transférés${slow ? ` — ${slow} > 3 s` : ""}`,
      };
    });
    await timed("perf-errors", "Assets & perf", "Erreurs runtime captées", async () => {
      const errs = errorsRef.current;
      return errs.length
        ? { status: "fail", detail: errs.slice(0, 3).join(" | ") }
        : { status: "ok", detail: "aucune erreur pendant le diagnostic" };
    });

    setRunning(false);
  }, [timed, pingFunction, countTable]);

  useEffect(() => {
    void runAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, Check[]>();
    checks.forEach((c) => {
      map.set(c.group, [...(map.get(c.group) ?? []), c]);
    });
    return Array.from(map.entries());
  }, [checks]);

  const summary = useMemo(() => {
    const ok = checks.filter((c) => c.status === "ok").length;
    const warn = checks.filter((c) => c.status === "warn").length;
    const fail = checks.filter((c) => c.status === "fail").length;
    return { ok, warn, fail };
  }, [checks]);

  const copyReport = useCallback(() => {
    const lines = [
      `Diagnostic preview — ${new Date().toISOString()}`,
      `${window.location.href}`,
      "",
      ...groups.flatMap(([group, items]) => [
        `## ${group}`,
        ...items.map(
          (c) => `- [${c.status.toUpperCase()}] ${c.label}${c.ms != null ? ` (${c.ms} ms)` : ""} — ${c.detail ?? ""}`,
        ),
        "",
      ]),
    ];
    void navigator.clipboard.writeText(lines.join("\n"));
  }, [groups]);

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <Helmet>
        <title>Diagnostic preview — One World Morocco</title>
        <meta
          name="description"
          content="Diagnostic technique du preview : contexte iframe, edge functions, base de données, assets et erreurs runtime."
        />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold">Diagnostic preview</h1>
          <p className="text-sm text-muted-foreground">
            Vérifie en un clic le contexte d'affichage, les edge functions publiques, la lecture en base et les
            performances de chargement.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void runAll()} disabled={running} size="sm">
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Relancer
            </Button>
            <Button onClick={copyReport} variant="secondary" size="sm" disabled={running || !checks.length}>
              <Copy className="mr-2 h-4 w-4" />
              Copier le rapport
            </Button>
            <Badge variant="secondary">{summary.ok} OK</Badge>
            {summary.warn > 0 && <Badge variant="outline">{summary.warn} à surveiller</Badge>}
            {summary.fail > 0 && <Badge variant="destructive">{summary.fail} en échec</Badge>}
            {errorCount > 0 && <Badge variant="destructive">{errorCount} erreur(s) runtime</Badge>}
          </div>
        </header>

        {groups.map(([group, items]) => (
          <Card key={group} className="p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{group}</h2>
            <ul className="space-y-3">
              {items.map((c) => (
                <li key={c.id} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0">
                    <StatusIcon status={c.status} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-medium">{c.label}</span>
                      {c.ms != null && <span className="text-xs text-muted-foreground">{c.ms} ms</span>}
                    </div>
                    {c.detail && <p className="break-words text-xs text-muted-foreground">{c.detail}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
