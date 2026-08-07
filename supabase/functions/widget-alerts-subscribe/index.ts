// Public endpoint used by the tides/weather widget settings panel to store
// subscriber preferences. All writes happen server-side with the service role
// so the table needs no anon INSERT/UPDATE policy (which previously allowed
// anyone to overwrite any subscriber row).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG_RE = /^[a-z0-9-]{1,64}$/;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_AVATAR_BYTES = 400 * 1024;

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const email = str(payload.email, 254)?.toLowerCase() ?? "";
  if (!EMAIL_RE.test(email)) return json({ error: "Invalid email" }, 400);

  const citySlug = str(payload.city_slug, 64)?.toLowerCase() ?? "";
  if (!SLUG_RE.test(citySlug)) return json({ error: "Invalid city" }, 400);

  const cityName = str(payload.city_name, 120);
  const nickname = str(payload.nickname, 60);
  const lang = ["fr", "en", "ar"].includes(String(payload.lang)) ? String(payload.lang) : "fr";
  const bool = (v: unknown) => v === true;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Optional avatar: { avatar: { mime, data(base64) } }
  let avatarUrl: string | null = str((payload.avatar_url as string) ?? null, 500);
  if (avatarUrl && !/^https:\/\//i.test(avatarUrl)) avatarUrl = null;

  const avatar = payload.avatar as { mime?: string; data?: string } | undefined;
  if (avatar?.data && avatar?.mime) {
    if (!ALLOWED_MIME.has(avatar.mime)) return json({ error: "Unsupported image type" }, 400);
    let bytes: Uint8Array;
    try {
      const raw = atob(String(avatar.data).replace(/^data:[^,]+,/, ""));
      bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    } catch {
      return json({ error: "Invalid image data" }, 400);
    }
    if (bytes.byteLength > MAX_AVATAR_BYTES) return json({ error: "Image too large" }, 400);

    const path = `${crypto.randomUUID()}.${EXT_BY_MIME[avatar.mime]}`;
    const { error: upErr } = await admin.storage.from("widget-avatars").upload(path, bytes, {
      contentType: avatar.mime,
      cacheControl: "3600",
      upsert: false,
    });
    if (upErr) {
      console.error("avatar upload failed:", upErr.message);
      return json({ error: "Avatar upload failed" }, 500);
    }
    avatarUrl = admin.storage.from("widget-avatars").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await admin.from("widget_alert_subscribers").upsert(
    {
      email,
      city_slug: citySlug,
      city_name: cityName,
      nickname,
      avatar_url: avatarUrl,
      lang,
      alert_spring_tide: bool(payload.alert_spring_tide),
      alert_surf: bool(payload.alert_surf),
      alert_kitesurf: bool(payload.alert_kitesurf),
      alert_wingfoil: bool(payload.alert_wingfoil),
      alert_fishing: bool(payload.alert_fishing),
    },
    { onConflict: "email,city_slug", ignoreDuplicates: false },
  );

  if (error) {
    console.error("subscribe upsert failed:", error.message);
    return json({ error: "Could not save preferences" }, 500);
  }

  return json({ ok: true, avatar_url: avatarUrl });
});
