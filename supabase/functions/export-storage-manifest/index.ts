// Génère un manifeste complet de tous les fichiers présents dans les buckets Storage.
// Sortie: JSON + script wget prêt à l'emploi pour tout télécharger en local.
// Sécurité: réservé aux utilisateurs staff (has_role admin ou staff).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Vérif auth staff
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return json({ error: "unauthorized" }, 401);
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const allowed = (roles ?? []).some((r: any) => ["admin", "staff"].includes(r.role));
    if (!allowed) return json({ error: "forbidden" }, 403);

    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "json"; // json | wget
    const exclude = (url.searchParams.get("exclude") ?? "")
      .split(",").map((s) => s.trim()).filter(Boolean);
    const include = (url.searchParams.get("include") ?? "")
      .split(",").map((s) => s.trim()).filter(Boolean);

    // Liste tous les buckets
    const { data: bucketsAll, error: bErr } = await admin.storage.listBuckets();
    const buckets = (bucketsAll ?? []).filter((b) => {
      if (include.length > 0) return include.includes(b.name);
      if (exclude.length > 0) return !exclude.includes(b.name);
      return true;
    });
    if (bErr) throw bErr;

    const manifest: Array<{
      bucket: string;
      public: boolean;
      path: string;
      size: number;
      updated_at: string | null;
      url: string;
    }> = [];

    for (const b of buckets ?? []) {
      await walk(admin, b.name, "", b.public, manifest, SUPABASE_URL);
    }

    if (format === "wget") {
      const lines = [
        "#!/usr/bin/env bash",
        "# Téléchargement complet du Storage One World Morocco",
        `# Généré le ${new Date().toISOString()}`,
        `# Total: ${manifest.length} fichiers`,
        "set -e",
        "mkdir -p storage-backup",
        "cd storage-backup",
        ...manifest.map(
          (f) =>
            `mkdir -p "${f.bucket}/${dir(f.path)}" && curl -fsSL -o "${f.bucket}/${f.path}" "${f.url}"`,
        ),
        'echo "✅ Backup terminé"',
      ];
      return new Response(lines.join("\n"), {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": 'attachment; filename="download-storage.sh"',
        },
      });
    }

    return json({
      generated_at: new Date().toISOString(),
      total_files: manifest.length,
      total_bytes: manifest.reduce((s, f) => s + (f.size || 0), 0),
      buckets: (buckets ?? []).map((b) => ({ name: b.name, public: b.public })),
      files: manifest,
    });
  } catch (e: any) {
    console.error("export-storage-manifest error", e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});

async function walk(
  admin: any,
  bucket: string,
  prefix: string,
  isPublic: boolean,
  out: any[],
  supaUrl: string,
) {
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        // dossier
        await walk(admin, bucket, full, isPublic, out, supaUrl);
      } else {
        let url: string;
        if (isPublic) {
          url = `${supaUrl}/storage/v1/object/public/${bucket}/${full}`;
        } else {
          const { data: signed } = await admin.storage
            .from(bucket)
            .createSignedUrl(full, 60 * 60 * 24 * 7); // 7 jours
          url = signed?.signedUrl ?? "";
        }
        out.push({
          bucket,
          public: isPublic,
          path: full,
          size: item.metadata?.size ?? 0,
          updated_at: item.updated_at ?? null,
          url,
        });
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }
}

function dir(p: string) {
  const i = p.lastIndexOf("/");
  return i === -1 ? "" : p.slice(0, i);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
