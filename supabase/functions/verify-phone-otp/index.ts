import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizePhone(p: string) {
  return p.replace(/[\s\-().]/g, "");
}

function randomPassword() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { phone, code } = await req.json();
    if (!phone || !code) {
      return new Response(JSON.stringify({ error: "phone and code required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const normalized = normalizePhone(String(phone));
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: otp, error: otpErr } = await admin
      .from("phone_otp_codes")
      .select("*")
      .eq("phone", normalized)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (otpErr) throw otpErr;
    if (!otp) {
      return new Response(JSON.stringify({ error: "Aucun code en attente. Renvoyez un code." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (new Date(otp.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Code expiré. Renvoyez un nouveau code." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (otp.attempts >= 5) {
      return new Response(JSON.stringify({ error: "Trop de tentatives. Renvoyez un nouveau code." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const codeHash = await sha256(String(code).trim());
    if (codeHash !== otp.code_hash) {
      await admin.from("phone_otp_codes").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      return new Response(JSON.stringify({ error: "Code invalide" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark consumed
    await admin.from("phone_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);

    // Find or create user by phone
    const tempPassword = randomPassword();
    let userId: string | null = null;

    // Try list users by phone (admin API)
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) throw listErr;
    const found = list.users.find((u: any) => u.phone === normalized.replace(/^\+/, "") || u.phone === normalized);

    if (found) {
      userId = found.id;
      const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password: tempPassword, phone_confirm: true });
      if (updErr) throw updErr;
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        phone: normalized,
        password: tempPassword,
        phone_confirm: true,
      });
      if (createErr) throw createErr;
      userId = created.user?.id ?? null;
    }

    return new Response(JSON.stringify({ ok: true, phone: normalized, password: tempPassword }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
