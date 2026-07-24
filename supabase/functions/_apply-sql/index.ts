// One-shot admin SQL applier. Protected by ADMIN_SECRET. Delete after use.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== Deno.env.get("ADMIN_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }
  const { table, id, patch } = await req.json();
  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { error } = await supa.from(table).update(patch).eq("id", id);
  if (error) return new Response(JSON.stringify(error), { status: 500 });
  return new Response("ok");
});
