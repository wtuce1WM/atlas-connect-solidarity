import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { assertStaff } from "../_shared/auth-helpers.ts";
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts';
import { sendAndLog } from '../_shared/email-send-log.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SITE_URL = "https://oneworldmorocco.com";
const REDIRECT_TO = `${SITE_URL}/affiliates/reset-password`;

function randomPassword(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const guard = await assertStaff(req, corsHeaders);
    if (guard instanceof Response) return guard;

    const body = await req.json().catch(() => ({}));
    const affiliateId = String(body?.affiliate_id || "");
    const overrideEmail = body?.email ? String(body.email).toLowerCase().trim() : "";
    if (!affiliateId) return json({ error: "affiliate_id requis" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: affiliate, error: affErr } = await admin
      .from("affiliates")
      .select("id, name, user_id, contact_email, contact_name")
      .eq("id", affiliateId)
      .maybeSingle();
    if (affErr || !affiliate) return json({ error: "Affilié introuvable" }, 404);

    const email = overrideEmail || (affiliate.contact_email || "").toLowerCase().trim();
    if (!email || !email.includes("@")) {
      return json({ error: "Aucun email de contact valide pour cet affilié" }, 400);
    }

    // 1. S'assurer qu'un compte auth existe et qu'il est bien rattaché à l'affilié
    let userId = affiliate.user_id as string | null;

    if (!userId) {
      const created = await admin.auth.admin.createUser({
        email,
        password: randomPassword(),
        email_confirm: true,
        user_metadata: { is_affiliate_signup: true },
      });

      if (created.error) {
        const msg = (created.error.message || "").toLowerCase();
        const exists = msg.includes("already registered") || msg.includes("already been registered") || msg.includes("already exists");
        if (!exists) return json({ error: created.error.message }, 400);

        const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (listErr) return json({ error: listErr.message }, 400);
        const existing = list.users.find((u) => (u.email || "").toLowerCase() === email);
        if (!existing) return json({ error: "Email déjà enregistré mais utilisateur introuvable" }, 400);

        const { data: other } = await admin
          .from("affiliates")
          .select("id, name")
          .eq("user_id", existing.id)
          .neq("id", affiliateId)
          .maybeSingle();
        if (other) return json({ error: `Cet email est déjà rattaché à l'affilié « ${other.name} »` }, 400);

        userId = existing.id;
      } else {
        userId = created.data.user?.id ?? null;
      }

      if (!userId) return json({ error: "Impossible de créer le compte" }, 400);

      await admin
        .from("user_roles")
        .upsert({ user_id: userId, role: "affiliate" }, { onConflict: "user_id,role", ignoreDuplicates: true });
      await admin.from("affiliates").update({ user_id: userId }).eq("id", affiliateId);
    }

    // 2. Générer le lien de création de mot de passe (recovery)
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: REDIRECT_TO },
    });
    if (linkErr || !linkData?.properties?.action_link) {
      return json({ error: linkErr?.message || "Impossible de générer le lien" }, 400);
    }

    // 3. Envoyer l'email de bienvenue
    try {
      await sendAndLog(
        () =>
          sendTemplateEmail("affiliate-welcome", email, {
            templateData: {
              affiliateName: affiliate.name || "",
              contactName: affiliate.contact_name || "",
              email,
              actionUrl: linkData.properties.action_link,
              dashboardUrl: `${SITE_URL}/affiliates/dashboard`,
            },
            idempotencyKey: `affiliate-welcome-${affiliateId}-${Date.now()}`,
          }),
        "affiliate-welcome",
        email,
      );
    } catch (sendErr) {
      const msg = sendErr instanceof Error ? sendErr.message : String(sendErr);
      console.error("affiliate-welcome send failed:", msg);
      return json({ error: "Envoi de l'email échoué: " + msg }, 400);
    }

    return json({ success: true, email, user_id: userId });
  } catch (error) {
    console.error("send-affiliate-welcome error:", error);
    return json({ error: error instanceof Error ? error.message : "Erreur inconnue" }, 400);
  }
});
