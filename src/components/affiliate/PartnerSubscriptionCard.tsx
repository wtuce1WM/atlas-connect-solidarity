import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment, openPaddleCheckout } from "@/lib/paddle";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Crown } from "lucide-react";
import { toast } from "sonner";

type Sub = {
  price_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

const PLANS = [
  { id: "partner_monthly", label: "Mensuel", price: "20 € / mois" },
  { id: "partner_yearly", label: "Annuel", price: "200 € / an" },
];

function isActive(s: Sub | null) {
  if (!s) return false;
  const future = !s.current_period_end || new Date(s.current_period_end) > new Date();
  if (["active", "trialing", "past_due"].includes(s.status)) return future;
  return s.status === "canceled" && !!s.current_period_end && future;
}

export default function PartnerSubscriptionCard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | undefined>();
  const [sub, setSub] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("subscriptions")
      .select("price_id,status,current_period_end,cancel_at_period_end")
      .eq("user_id", uid)
      .eq("environment", getPaddleEnvironment())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSub(data as Sub | null);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return setLoading(false);
      setUserId(data.user.id);
      setEmail(data.user.email ?? undefined);
      load(data.user.id);
    });
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel("partner-sub")
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` }, () => load(userId))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, load]);

  const checkout = async (priceId: string) => {
    if (!userId) return;
    setBusy(priceId);
    try {
      await openPaddleCheckout({ priceId, email, userId, successUrl: `${window.location.origin}/affiliates/dashboard?checkout=success` });
    } catch {
      toast.error("Impossible d'ouvrir le paiement");
    } finally {
      setBusy(null);
    }
  };

  const manage = async (action: "portal" | "change_plan", priceId?: string) => {
    setBusy(action);
    const { data, error } = await supabase.functions.invoke("partner-subscription-manage", {
      body: { action, priceId, environment: getPaddleEnvironment() },
    });
    setBusy(null);
    if (error || data?.error) return toast.error("Action impossible pour le moment");
    if (action === "portal" && data?.url) window.open(data.url, "_blank");
    if (action === "change_plan") toast.success("Changement de formule programmé à la prochaine échéance");
  };

  const active = isActive(sub);
  const current = PLANS.find((p) => p.id === sub?.price_id);
  const other = PLANS.find((p) => p.id !== sub?.price_id);
  const endDate = sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("fr-FR") : null;

  return (
    <Card className="bg-card border-border mb-8">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-gold/20 p-3"><Crown className="h-6 w-6 text-gold" /></div>
          <div>
            <CardTitle className="text-lg text-foreground">Abonnement partenaire</CardTitle>
            <CardDescription className="text-muted-foreground">
              {active ? `Formule ${current?.label ?? ""} active` : "Choisissez votre formule"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <PaymentTestModeBanner />
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gold" />
        ) : active ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {sub?.status === "canceled" || sub?.cancel_at_period_end
                ? `Abonnement annulé — accès conservé jusqu'au ${endDate}.`
                : sub?.status === "past_due"
                ? "Le dernier paiement a échoué : mettez à jour votre moyen de paiement."
                : `Prochain renouvellement : ${endDate}.`}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={!!busy} onClick={() => manage("portal")}>Gérer / annuler</Button>
              {sub?.status !== "canceled" && !sub?.cancel_at_period_end && other && (
                <Button variant="outline" disabled={!!busy} onClick={() => manage("change_plan", other.id)}>
                  Passer en {other.label.toLowerCase()} ({other.price}) à la prochaine échéance
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PLANS.map((p) => (
              <Button key={p.id} className="h-auto py-4 flex-col" disabled={!!busy} onClick={() => checkout(p.id)}>
                {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><span className="font-semibold">{p.label}</span><span className="text-sm opacity-80">{p.price}</span></>)}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
