import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertStaff } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await assertStaff(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("businesses")
      .select("name, city, neighborhood, address, latitude, longitude, main_category, phone, website, google_maps_url, categories")
      .eq("is_active", true)
      .not("google_maps_url", "is", null)
      .neq("google_maps_url", "")
      .order("city")
      .order("name");

    if (error) throw error;

    // Google My Maps CSV format
    const headers = ["Name", "Address", "Latitude", "Longitude", "Description", "Category", "Phone", "Website", "Google Maps URL"];
    
    const escCsv = (val: string | null | undefined) => {
      if (!val) return "";
      const s = String(val);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = (data || []).map((b: any) => {
      const fullAddress = [b.address, b.neighborhood, b.city].filter(Boolean).join(", ");
      const cats = [b.main_category, ...(b.categories || [])].filter(Boolean).join(", ");
      return [
        escCsv(b.name),
        escCsv(fullAddress),
        b.latitude || "",
        b.longitude || "",
        escCsv(cats),
        escCsv(b.main_category),
        escCsv(b.phone),
        escCsv(b.website),
        escCsv(b.google_maps_url),
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    return new Response(csv, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="businesses-google-my-maps.csv"`,
      },
    });
  } catch (e) {
    console.error("Export error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
