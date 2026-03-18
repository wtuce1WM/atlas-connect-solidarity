import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, CloudUpload } from "lucide-react";

interface YextSyncButtonProps {
  businessId: string;
  businessName: string;
}

type SyncStatus = "idle" | "syncing" | "checking" | "synced" | "not_synced" | "error";

const YextSyncButton = ({ businessId, businessName }: YextSyncButtonProps) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);

  const callYextSync = async (action: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Non authentifié");

    const { data, error } = await supabase.functions.invoke("yext-sync", {
      body: { businessId, action },
    });

    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleSync = async () => {
    setStatus("syncing");
    setLastError(null);
    try {
      await callYextSync("sync");
      setStatus("synced");
      toast({ title: `${businessName} synchronisé avec Yext ✓` });
    } catch (err: any) {
      setStatus("error");
      setLastError(err.message);
      toast({
        title: "Erreur de synchronisation",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleCheckStatus = async () => {
    setStatus("checking");
    setLastError(null);
    try {
      const result = await callYextSync("status");
      setStatus(result.synced ? "synced" : "not_synced");
    } catch (err: any) {
      setStatus("not_synced");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleSync}
        disabled={status === "syncing" || status === "checking"}
        className="gap-1.5"
      >
        {status === "syncing" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CloudUpload className="h-3.5 w-3.5" />
        )}
        Diffuser
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={handleCheckStatus}
        disabled={status === "syncing" || status === "checking"}
        className="gap-1.5 text-muted-foreground"
      >
        {status === "checking" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        Statut
      </Button>

      {status === "synced" && (
        <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1">
          <CheckCircle2 className="h-3 w-3" /> Diffusé
        </Badge>
      )}
      {status === "not_synced" && (
        <Badge variant="secondary" className="gap-1">
          <AlertCircle className="h-3 w-3" /> Non diffusé
        </Badge>
      )}
      {status === "error" && (
        <Badge variant="destructive" className="gap-1 text-xs">
          <AlertCircle className="h-3 w-3" /> {lastError?.slice(0, 40)}
        </Badge>
      )}
    </div>
  );
};

export default YextSyncButton;
