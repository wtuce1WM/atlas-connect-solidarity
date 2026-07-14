// Shared auth helpers for edge functions.
// - assertAllowedOrigin: for public paid-API endpoints (blocks cURL/bots)
// - assertStaff: for staff-only endpoints (requires signed-in staff)

import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_HOST_SUFFIXES = [
  "oneworldmorocco.com",
  ".oneworldmorocco.com",
  ".lovable.app",
  ".lovable.dev",
  ".lovableproject.com",
];
const ALLOWED_LITERAL_HOSTS = ["localhost", "127.0.0.1", "lovable.app", "lovable.dev"];

function hostAllowed(host: string): boolean {
  const h = host.toLowerCase();
  if (ALLOWED_LITERAL_HOSTS.includes(h)) return true;
  return ALLOWED_HOST_SUFFIXES.some((s) => (s.startsWith(".") ? h.endsWith(s) : h === s));
}

/**
 * Validates that the request originates from an allowed frontend.
 * Returns `null` when OK, or a Response to short-circuit when blocked.
 */
export function assertAllowedOrigin(req: Request, corsHeaders: Record<string, string>): Response | null {
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  if (!origin) {
    // Server-to-server (e.g. other edge functions using service role) — allow.
    return null;
  }
  try {
    const u = new URL(origin);
    if (hostAllowed(u.hostname)) return null;
  } catch { /* fallthrough */ }
  return new Response(JSON.stringify({ error: "Forbidden origin" }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Ensures the caller is a signed-in staff or admin user.
 * Returns `{ userId }` on success or a Response on failure.
 */
export async function assertStaff(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error } = await supabase.auth.getClaims(token);
  if (error || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claimsData.claims.sub as string;
  const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userId });
  if (!isStaff) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return { userId };
}
