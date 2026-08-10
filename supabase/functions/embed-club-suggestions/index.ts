// Embeddings backfill for ai_suggestions.
// - Admin/staff only.
// - Embeds label_fr (fallback label_en/label_ar) with openai/text-embedding-3-small (1536-dim).
// - Only (re)embeds rows whose composite source text changed since last embed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/embeddings";
const MODEL = "openai/text-embedding-3-small";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: rolesData } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const roles = new Set((rolesData || []).map((r: any) => r.role));
    if (!roles.has("staff") && !roles.has("admin") && !roles.has("moderator")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const force = !!body.force;

    const { data: rows, error } = await admin
      .from("ai_suggestions")
      .select("id, label_fr, label_en, label_ar, label_embedded_source")
      .eq("is_active", true);
    if (error) throw error;

    const toEmbed: { id: string; source: string }[] = [];
    for (const r of rows || []) {
      const src = [r.label_fr, r.label_en, r.label_ar].filter(Boolean).join(" || ").trim();
      if (!src) continue;
      if (!force && r.label_embedded_source === src) continue;
      toEmbed.push({ id: r.id, source: src });
    }

    let processed = 0;
    // Batch of ≤ 100 (openai cap 300k tokens; labels are tiny → fine).
    for (let i = 0; i < toEmbed.length; i += 50) {
      const chunk = toEmbed.slice(i, i + 50);
      const resp = await fetch(GATEWAY, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, input: chunk.map((c) => c.source) }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        return new Response(JSON.stringify({ error: `gateway ${resp.status}`, detail: t.slice(0, 500), processed }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const json = await resp.json();
      const now = new Date().toISOString();
      const updates = (json.data || []).map((d: any) => ({
        id: chunk[d.index].id,
        embedding: d.embedding as number[],
        source: chunk[d.index].source,
      }));
      for (const u of updates) {
        const { error: upErr } = await admin
          .from("ai_suggestions")
          .update({
            label_embedding: u.embedding as any,
            label_embedded_source: u.source,
            label_embedded_at: now,
          })
          .eq("id", u.id);
        if (upErr) console.error("update err", u.id, upErr.message);
        else processed++;
      }
    }

    return new Response(JSON.stringify({ ok: true, total: rows?.length || 0, processed, skipped: (rows?.length || 0) - toEmbed.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
