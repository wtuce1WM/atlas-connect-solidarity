import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const EVENT_TYPES = [
  "view","whatsapp_click","phone_click","email_click","directions_click",
  "affiliate_click","bookmark_add","bookmark_remove","share_open","share_complete",
  "booking_intent","video_play","document_open","outbound_click","impression",
] as const;

const EventSchema = z.object({
  business_id: z.string().uuid(),
  event_type: z.enum(EVENT_TYPES),
  event_subtype: z.string().max(64).optional().nullable(),
  session_id: z.string().min(1).max(80).optional().nullable(),
  source_page: z.preprocess(
    (v) => (typeof v === "string" ? v.slice(0, 512) : v),
    z.string().max(512).optional().nullable(),
  ),
  referrer_domain: z.string().max(255).optional().nullable(),
  device: z.enum(["mobile", "tablet", "desktop"]).optional().nullable(),
  meta: z.record(z.unknown()).optional().nullable(),
});

const BodySchema = z.object({
  events: z.array(EventSchema).min(1).max(20),
});

// Naive in-memory rate limit (per IP, per function instance)
const RATE = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 120; // events/min/IP
const RATE_WINDOW_MS = 60_000;

function getDevice(ua: string | null): string | null {
  if (!ua) return null;
  if (/mobile|iphone|android.*mobile/i.test(ua)) return "mobile";
  if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) return "tablet";
  return "desktop";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Rate limit
  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const now = Date.now();
  const rec = RATE.get(ip);
  if (!rec || rec.reset < now) {
    RATE.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
  } else {
    rec.count += 1;
    if (rec.count > RATE_LIMIT) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.flatten() }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Optional user id from JWT (verify_jwt=false → decode loosely)
  let userId: string | null = null;
  const authHeader = req.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    try {
      const token = authHeader.slice(7);
      const supa = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data } = await supa.auth.getUser(token);
      userId = data?.user?.id ?? null;
    } catch { /* anonymous */ }
  }

  const country = req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || null;
  const city = req.headers.get("cf-ipcity") || req.headers.get("x-vercel-ip-city") || null;
  const device = getDevice(req.headers.get("user-agent"));

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const rows = parsed.data.events.map((e) => ({
    business_id: e.business_id,
    event_type: e.event_type,
    event_subtype: e.event_subtype ?? null,
    user_id: userId,
    session_id: e.session_id ?? null,
    source_page: e.source_page ?? null,
    referrer_domain: e.referrer_domain ?? null,
    device: e.device ?? device,
    country,
    city,
    meta: e.meta ?? {},
  }));

  const { error } = await supabaseAdmin.from("business_events").insert(rows);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, inserted: rows.length }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
