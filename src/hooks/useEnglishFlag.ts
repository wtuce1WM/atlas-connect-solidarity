// Gates the English locale on the front-end.
// EN is hidden by default. It becomes visible when ANY of these is true:
//   1. URL contains ?lang_en=1 (persisted in localStorage afterwards)
//   2. localStorage flag "1wm_lang_en" === "1"
//   3. The current user has role "admin" or "staff"
// Use ?lang_en=0 in the URL to disable.
//
// EN is intentionally NOT exposed via a dedicated URL (/en/...) and no
// hreflang is emitted: Google has nothing to crawl, so the EN version
// cannot be indexed while we test it.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const LS_KEY = "1wm_lang_en";

export function useEnglishFlag(): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const url = new URL(window.location.href);
      const q = url.searchParams.get("lang_en");
      if (q === "1") {
        localStorage.setItem(LS_KEY, "1");
        return true;
      }
      if (q === "0") {
        localStorage.removeItem(LS_KEY);
        return false;
      }
      return localStorage.getItem(LS_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (enabled) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      if (cancelled) return;
      if (roles?.some((r: { role: string }) => r.role === "admin" || r.role === "staff")) {
        setEnabled(true);
      }
    })();
    return () => { cancelled = true; };
  }, [enabled]);

  return enabled;
}
