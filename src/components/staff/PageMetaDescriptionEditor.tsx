import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { setOverrides, getOverride } from "@/seo/pageMetaOverrides";

interface Props {
  routePattern: string;
  fallback: string;
}

// Inline editor for the per-route meta description.
// Writes to public.page_meta_overrides (staff-only) and refreshes the
// in-memory cache so RouteSeo picks up the new value immediately.
const PageMetaDescriptionEditor = ({ routePattern, fallback }: Props) => {
  const initial = getOverride(routePattern)?.description ?? "";
  const [value, setValue] = useState<string>(initial);
  const [original, setOriginal] = useState<string>(initial);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (supabase as any)
      .from("page_meta_overrides")
      .select("description")
      .eq("route_pattern", routePattern)
      .maybeSingle()
      .then(({ data }: { data: { description: string | null } | null }) => {
        if (cancelled) return;
        const v = data?.description ?? "";
        setValue(v);
        setOriginal(v);
        setLoaded(true);
      });
    return () => { cancelled = true; };
  }, [routePattern]);

  const dirty = value !== original;
  const effective = value || fallback;

  const refreshCache = async () => {
    const { data } = await (supabase as any)
      .from("page_meta_overrides")
      .select("route_pattern, title, description, og_image, og_type");
    if (data) setOverrides(data);
  };

  const save = async () => {
    setSaving(true);
    const trimmed = value.trim();
    let error;
    if (!trimmed) {
      ({ error } = await (supabase as any)
        .from("page_meta_overrides")
        .delete()
        .eq("route_pattern", routePattern));
    } else {
      ({ error } = await (supabase as any)
        .from("page_meta_overrides")
        .upsert({ route_pattern: routePattern, description: trimmed }, { onConflict: "route_pattern" }));
    }
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Description meta enregistrée");
      setOriginal(trimmed);
      setValue(trimmed);
      await refreshCache();
    }
    setSaving(false);
  };

  const reset = () => setValue(original);

  return (
    <div className="space-y-1.5">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={fallback || "Description meta…"}
        rows={2}
        className="text-xs min-h-[52px]"
        disabled={!loaded}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground">
          {effective.length} car. {value ? "(override)" : "(défaut code)"}
        </span>
        <div className="flex gap-1">
          {dirty && (
            <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={reset}>
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={save}
            disabled={!dirty || saving}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PageMetaDescriptionEditor;
