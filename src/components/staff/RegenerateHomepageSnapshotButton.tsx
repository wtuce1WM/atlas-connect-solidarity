import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  cityName: string;
}

const RegenerateHomepageSnapshotButton = ({ cityName }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("regenerate-homepage-cards", {
        body: { city: cityName },
      });
      if (error) throw error;
      const count = data?.results?.[0]?.count ?? 0;
      toast.success(`Snapshot régénéré : ${count} vignettes pour ${cityName}`);
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4 flex items-center justify-between rounded-md border border-border bg-card p-3">
      <div>
        <p className="text-sm font-medium">Cache des vignettes — {cityName}</p>
        <p className="text-xs text-muted-foreground">
          Régénère le snapshot JSON après modifications du paramétrage homepage.
        </p>
      </div>
      <Button size="sm" onClick={handleClick} disabled={loading}>
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-2" />
        )}
        Régénérer le snapshot
      </Button>
    </div>
  );
};

export default RegenerateHomepageSnapshotButton;
