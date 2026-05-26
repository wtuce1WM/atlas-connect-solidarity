import { useEffect, useState, lazy, Suspense } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import NotFound from "@/pages/NotFound";

const SearchPage = lazy(() => import("@/pages/SearchPage"));
const DestinationPage = lazy(() => import("@/pages/DestinationPage"));

// Routes already used at root — never treat as a vanity slug.
const RESERVED = new Set([
  "", "videos", "ancien-index", "business", "city", "category", "service",
  "search", "staff", "affiliates", "devenir-affilie", "mission", "contact",
  "blog", "neighborhood", "carte", "subcategory", "hotels", "club",
  "search-analytics", "destination", "conditions-generales", "unsubscribe",
  "fiche", "test", "install", "corporate",
]);

type Resolved =
  | { kind: "business"; ready: true }
  | { kind: "destination"; nameFr: string };

const VanityResolver = () => {
  const { vanitySlug = "" } = useParams();
  const [, setSearchParams] = useSearchParams();
  const [notFound, setNotFound] = useState(false);
  const [resolved, setResolved] = useState<Resolved | null>(null);

  useEffect(() => {
    const slug = decodeURIComponent(vanitySlug).toLowerCase();
    if (!slug || RESERVED.has(slug.split("/")[0])) {
      setNotFound(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("vanity_urls")
        .select("target_type, target_id")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (!data) { setNotFound(true); return; }

      if (data.target_type === "business") {
        const { data: biz } = await supabase
          .from("businesses")
          .select("id, name, city, kp_regroupement, kp_regroupement_2, kp_active, is_active")
          .eq("id", data.target_id)
          .maybeSingle();
        if (cancelled) return;
        if (!biz || !biz.is_active) { setNotFound(true); return; }

        const ids: string[] = [biz.id];
        if (biz.kp_active) {
          const kp1 = biz.kp_regroupement?.trim();
          const kp2 = biz.kp_regroupement_2?.trim();
          const orParts: string[] = [];
          if (kp1) orParts.push(`kp_regroupement.eq.${kp1}`);
          if (kp2) orParts.push(`kp_regroupement_2.eq.${kp2}`);
          if (orParts.length > 0) {
            const { data: siblings } = await supabase
              .from("businesses")
              .select("id")
              .eq("is_active", true)
              .neq("id", biz.id)
              .or(orParts.join(","));
            if (!cancelled && siblings) ids.push(...siblings.map((s: any) => s.id));
          }
        }
        if (cancelled) return;
        const params = new URLSearchParams();
        params.set("openBusiness", biz.id);
        params.set("pinIds", ids.join(","));
        if (biz.name) params.set("q", biz.name);
        if (biz.city) params.set("t", biz.city);
        // Inject params on the SAME vanity path (no redirect).
        setSearchParams(params, { replace: true });
        setResolved({ kind: "business", ready: true });
      } else if (data.target_type === "destination") {
        const { data: dest } = await supabase
          .from("destinations").select("name_fr").eq("id", data.target_id).maybeSingle();
        if (cancelled) return;
        if (dest?.name_fr) setResolved({ kind: "destination", nameFr: dest.name_fr });
        else setNotFound(true);
      } else {
        setNotFound(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vanitySlug]);

  if (notFound) return <NotFound />;
  if (!resolved) return null;

  if (resolved.kind === "business") {
    return <Suspense fallback={null}><SearchPage /></Suspense>;
  }
  // Destination: render DestinationPage directly under the vanity URL.
  // DestinationPage reads :destinationName from params; provide via a wrapper.
  return (
    <Suspense fallback={null}>
      <DestinationVanityWrapper nameFr={resolved.nameFr} />
    </Suspense>
  );
};

// DestinationPage uses useParams().destinationName. We override URL params by
// briefly rewriting history (cosmetic), keeping the vanity slug visible.
const DestinationVanityWrapper = ({ nameFr }: { nameFr: string }) => {
  // Render DestinationPage but force the :destinationName via a memory route
  // is overkill — instead, push name as a query and let DestinationPage adapt
  // would require code changes. Minimal: redirect to /destination/<name>.
  // (Destinations are rare vs businesses; keep simple.)
  if (typeof window !== "undefined") {
    window.location.replace(`/destination/${encodeURIComponent(nameFr)}`);
  }
  return null;
};

export default VanityResolver;
