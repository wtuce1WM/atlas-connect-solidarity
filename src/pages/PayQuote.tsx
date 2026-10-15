import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { initializePaddle, getPaddleEnvironment } from "@/lib/paddle";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";

const PayQuote = () => {
  const { id } = useParams();
  const paid = new URLSearchParams(window.location.search).get("paid") === "1";
  const [info, setInfo] = useState<{ transactionId: string; number: string; total: number; currency: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = async (txn: string) => {
    await initializePaddle();
    window.Paddle.Checkout.open({
      transactionId: txn,
      settings: {
        displayMode: "overlay",
        successUrl: `${window.location.origin}/payer-devis/${id}?paid=1`,
        allowLogout: false,
        variant: "one-page",
      },
    });
  };

  useEffect(() => {
    if (paid || !id) return;
    supabase.functions
      .invoke("pay-quote", { body: { quote_id: id, environment: getPaddleEnvironment() } })
      .then(({ data, error: e }) => {
        if (e || data?.error) return setError(data?.error ?? "Paiement indisponible pour le moment.");
        setInfo(data);
        open(data.transactionId).catch(() => setError("Impossible d'ouvrir le paiement."));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, paid]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />
      <main className="max-w-md mx-auto px-6 py-20 text-center space-y-4">
        <h1 className="text-2xl font-bold">{paid ? "Merci, paiement reçu" : info ? `Devis ${info.number}` : "Paiement du devis"}</h1>
        {paid && <p className="text-muted-foreground">Votre règlement a bien été pris en compte. Un reçu vous est envoyé par email.</p>}
        {!paid && error && <p className="text-destructive">{error}</p>}
        {!paid && !error && !info && <p className="text-muted-foreground">Préparation du paiement…</p>}
        {!paid && info && (
          <>
            <p className="text-muted-foreground">Montant : {Number(info.total).toFixed(2)} {info.currency} TTC</p>
            <Button onClick={() => open(info.transactionId)}>Payer maintenant</Button>
          </>
        )}
      </main>
    </div>
  );
};

export default PayQuote;
