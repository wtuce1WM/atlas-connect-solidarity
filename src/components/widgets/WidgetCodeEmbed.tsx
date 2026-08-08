import { useEffect, useRef } from "react";

interface Props {
  code: string;
  className?: string;
}

/**
 * Injecte un code d'intégration tiers (HTML + <script>) et exécute réellement
 * les scripts : les scripts externes sont chargés dans l'ordre, puis les
 * scripts inline sont évalués (dangerouslySetInnerHTML ne les exécute pas).
 */
const WidgetCodeEmbed = ({ code, className }: Props) => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !code) return;
    let cancelled = false;

    host.innerHTML = "";
    const template = document.createElement("template");
    template.innerHTML = code;
    const scripts: HTMLScriptElement[] = Array.from(template.content.querySelectorAll("script"));
    scripts.forEach((s) => s.remove());
    host.appendChild(template.content.cloneNode(true));

    const run = async () => {
      for (const original of scripts) {
        if (cancelled) return;
        const s = document.createElement("script");
        for (const attr of Array.from(original.attributes)) s.setAttribute(attr.name, attr.value);
        if (original.src) {
          await new Promise<void>((resolve) => {
            s.onload = () => resolve();
            s.onerror = () => resolve();
            host.appendChild(s);
          });
        } else {
          s.text = original.textContent || "";
          host.appendChild(s);
        }
      }
    };
    run();

    return () => {
      cancelled = true;
      if (host) host.innerHTML = "";
    };
  }, [code]);

  return <div ref={hostRef} className={className} />;
};

export default WidgetCodeEmbed;
