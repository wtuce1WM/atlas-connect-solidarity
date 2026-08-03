import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Stethoscope, Check, X, Loader2, Copy } from "lucide-react";

type Status = "idle" | "running" | "ok" | "warn" | "fail";

interface Props {
  /** URL de l'iframe du widget à tester */
  url: string;
  /** Nom du widget (pour le rapport) */
  label: string;
}

interface CheckResult {
  name: string;
  ok: boolean | null;
  detail: string;
}

const TIMEOUT_MS = 15000;

const WidgetTester = ({ url, label }: Props) => {
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<CheckResult[]>([]);
  const holderRef = useRef<HTMLDivElement | null>(null);

  const runTest = async () => {
    setStatus("running");
    setResults([]);
    const out: CheckResult[] = [];

    // 1. URL bien formée
    let parsed: URL | null = null;
    try {
      parsed = new URL(url);
      out.push({ name: "URL du widget", ok: true, detail: parsed.origin + parsed.pathname });
    } catch {
      out.push({ name: "URL du widget", ok: false, detail: "URL invalide" });
      setResults(out);
      setStatus("fail");
      return;
    }

    // 2. HTTPS
    out.push({
      name: "Connexion sécurisée (HTTPS)",
      ok: parsed.protocol === "https:",
      detail: parsed.protocol === "https:" ? "OK" : "Le widget doit être servi en HTTPS",
    });

    // 3. Chargement réel dans une iframe
    const t0 = performance.now();
    const loaded = await new Promise<boolean>((resolve) => {
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:absolute;width:420px;height:520px;left:-9999px;top:0;border:0";
      iframe.src = url;
      let done = false;
      const finish = (v: boolean) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        iframe.remove();
        resolve(v);
      };
      const timer = window.setTimeout(() => finish(false), TIMEOUT_MS);
      iframe.onload = () => finish(true);
      iframe.onerror = () => finish(false);
      (holderRef.current || document.body).appendChild(iframe);
    });
    const ms = Math.round(performance.now() - t0);

    out.push({
      name: "Affichage dans une iframe",
      ok: loaded,
      detail: loaded ? `Chargé en ${ms} ms` : `Aucune réponse après ${TIMEOUT_MS / 1000} s`,
    });

    if (loaded) {
      out.push({
        name: "Temps de réponse",
        ok: ms < 6000,
        detail: ms < 2500 ? "Rapide" : ms < 6000 ? "Correct" : "Lent — vérifiez votre connexion",
      });
    }

    setResults(out);
    const hasFail = out.some((r) => r.ok === false && r.name !== "Temps de réponse");
    const hasWarn = out.some((r) => r.ok === false);
    setStatus(hasFail ? "fail" : hasWarn ? "warn" : "ok");
  };

  const copyReport = () => {
    const report = [
      `Diagnostic widget — ${label}`,
      url,
      new Date().toISOString(),
      "",
      ...results.map((r) => `${r.ok === false ? "[KO]" : "[OK]"} ${r.name} : ${r.detail}`),
    ].join("\n");
    navigator.clipboard.writeText(report);
    toast({ title: "Rapport copié", description: "Vous pouvez le coller dans un email de support." });
  };

  return (
    <div className="rounded-md border border-white/10 bg-white/5 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={runTest}
          disabled={status === "running"}
          className="text-white border-white/20 hover:bg-white/10 hover:text-white"
        >
          {status === "running" ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Stethoscope className="h-4 w-4 mr-1" />
          )}
          Tester ce widget
        </Button>

        {status === "ok" && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            Widget opérationnel
          </span>
        )}
        {status === "warn" && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Fonctionne avec réserves
          </span>
        )}
        {status === "fail" && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">
            Problème détecté
          </span>
        )}

        {results.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={copyReport}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <Copy className="h-3.5 w-3.5 mr-1" /> Copier le rapport
          </Button>
        )}
      </div>

      {results.length > 0 && (
        <ul className="space-y-1">
          {results.map((r) => (
            <li key={r.name} className="flex items-start gap-2 text-xs text-white/75">
              {r.ok === false ? (
                <X className="h-3.5 w-3.5 mt-0.5 text-red-400 shrink-0" />
              ) : (
                <Check className="h-3.5 w-3.5 mt-0.5 text-emerald-400 shrink-0" />
              )}
              <span>
                <span className="text-white/90">{r.name}</span> — {r.detail}
              </span>
            </li>
          ))}
        </ul>
      )}

      {status === "idle" && (
        <p className="text-[11px] text-white/50">
          Vérifie que ce widget se charge correctement (URL, HTTPS, affichage en iframe, temps de réponse).
        </p>
      )}

      <div ref={holderRef} aria-hidden className="hidden" />
    </div>
  );
};

export default WidgetTester;
