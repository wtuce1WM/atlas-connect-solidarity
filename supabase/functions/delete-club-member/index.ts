import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !caller) throw new Error("Invalid authentication");

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["admin", "staff"]);
    if (!roles || roles.length === 0) throw new Error("Access denied");

    const { member_id, also_delete_auth_user } = await req.json();
    if (!member_id) throw new Error("Missing member_id");

    const { data: member, error: memErr } = await admin
      .from("club_members")
      .select("id, user_id, email")
      .eq("id", member_id)
      .maybeSingle();
    if (memErr) throw memErr;
    if (!member) throw new Error("Member not found");

    // Delete club_members row (cascades on club_member_personas, club_trips, etc. if FKs set)
    const { error: delErr } = await admin.from("club_members").delete().eq("id", member_id);
    if (delErr) throw delErr;

    let auth_user_deleted = false;
    if (also_delete_auth_user && member.user_id) {
      const { error: authDelErr } = await admin.auth.admin.deleteUser(member.user_id);
      if (authDelErr) {
        console.error("Auth delete failed:", authDelErr);
      } else {
        auth_user_deleted = true;
      }
    }

    return new Response(
      JSON.stringify({ success: true, auth_user_deleted, email: member.email }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e: any) {
    console.error("delete-club-member error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
