import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "valid" | "already" | "invalid" | "success" | "error">("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    const validate = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        const data = await res.json();
        if (!res.ok) { setStatus("invalid"); return; }
        if (data.valid === false && data.reason === "already_unsubscribed") { setStatus("already"); return; }
        setStatus("valid");
      } catch { setStatus("error"); }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (error) { setStatus("error"); return; }
      if (data?.success) { setStatus("success"); }
      else if (data?.reason === "already_unsubscribed") { setStatus("already"); }
      else { setStatus("error"); }
    } catch { setStatus("error"); }
    finally { setProcessing(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card rounded-xl shadow-lg p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Désinscription</h1>
        {status === "loading" && <p className="text-muted-foreground">Vérification en cours…</p>}
        {status === "valid" && (
          <>
            <p className="text-muted-foreground">Souhaitez-vous vous désinscrire des emails ?</p>
            <button onClick={handleUnsubscribe} disabled={processing}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
              {processing ? "En cours…" : "Confirmer la désinscription"}
            </button>
          </>
        )}
        {status === "already" && <p className="text-muted-foreground">Vous êtes déjà désinscrit(e).</p>}
        {status === "success" && <p className="text-green-600 font-medium">Désinscription confirmée ✓</p>}
        {status === "invalid" && <p className="text-destructive">Lien invalide ou expiré.</p>}
        {status === "error" && <p className="text-destructive">Une erreur est survenue. Réessayez plus tard.</p>}
      </div>
    </div>
  );
};

export default Unsubscribe;
