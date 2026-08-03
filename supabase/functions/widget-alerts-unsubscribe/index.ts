// One-click unsubscribe from widget weather alerts.
// GET /functions/v1/widget-alerts-unsubscribe?token=<uuid>
import { createClient } from "npm:@supabase/supabase-js@2";

const page = (title: string, msg: string) =>
  new Response(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;font-family:Helvetica,Arial,sans-serif;background:#0f172a;color:#f8fafc;display:flex;min-height:100vh;align-items:center;justify-content:center">
<div style="max-width:420px;padding:32px;text-align:center">
<h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
<p style="font-size:15px;line-height:23px;color:#cbd5e1;margin:0 0 20px">${msg}</p>
<a href="https://oneworldmorocco.com/widgets" style="color:#e2725b;font-size:14px">oneworldmorocco.com</a>
</div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return page("Lien invalide", "Ce lien de désinscription n'est pas valide.");
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await admin
    .from("widget_alert_subscribers")
    .update({
      alert_spring_tide: false,
      alert_surf: false,
      alert_kitesurf: false,
      alert_wingfoil: false,
      alert_fishing: false,
    })
    .eq("unsubscribe_token", token)
    .select("email, city_name, city_slug")
    .maybeSingle();

  if (error) {
    console.error("unsubscribe error", error.message);
    return page("Erreur", "Impossible de traiter la demande pour le moment.");
  }
  if (!data) return page("Lien inconnu", "Cet abonnement n'existe plus.");

  return page(
    "Désinscription confirmée",
    `Vous ne recevrez plus d'alertes pour ${data.city_name || data.city_slug}. Vous pouvez les réactiver à tout moment depuis les paramètres du widget.`,
  );
});
