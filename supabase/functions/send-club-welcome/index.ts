import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Identifie le membre via son JWT quand il est fourni, sinon via member_id.
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("Authorization") || "";
    let userId: string | null = null;
    if (authHeader.startsWith("Bearer ")) {
      const { data } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = data.user?.id ?? null;
    }

    const memberId = body?.member_id ? String(body.member_id) : "";
    if (!userId && !memberId) return json({ error: "Non autorisé" }, 401);

    let query = admin
      .from("club_members")
      .select("id, email, nickname, first_name, welcome_email_sent_at");
    query = userId ? query.eq("user_id", userId) : query.eq("id", memberId);

    const { data: member, error: memberErr } = await query.maybeSingle();
    if (memberErr) return json({ error: memberErr.message }, 400);
    if (!member) return json({ error: "Membre introuvable" }, 404);
    if (member.welcome_email_sent_at) return json({ success: true, skipped: "already_sent" });

    const email = String(member.email || "").toLowerCase().trim();
    if (!email.includes("@")) return json({ success: true, skipped: "no_email" });

    try {
      await sendAndLog(
        () =>
          sendTemplateEmail("club-welcome", email, {
            templateData: {
              nickname: member.nickname || member.first_name || "",
              email,
              clubUrl: "https://oneworldmorocco.com/club",
            },
            idempotencyKey: `club-welcome-${member.id}`,
          }),
        "club-welcome",
        email,
      );
    } catch (sendErr) {
      const msg = sendErr instanceof Error ? sendErr.message : String(sendErr);
      console.error("club-welcome send failed:", msg);
      return json({ error: msg }, 400);
    }

    await admin
      .from("club_members")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", member.id);

    return json({ success: true, email });
  } catch (error) {
    console.error("send-club-welcome error:", error);
    return json({ error: error instanceof Error ? error.message : "Erreur inconnue" }, 400);
  }
});
