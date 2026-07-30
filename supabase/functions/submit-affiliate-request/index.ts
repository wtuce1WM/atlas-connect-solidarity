import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const BodySchema = z.object({
  businessName: z.string().min(1).max(255),
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
  phone: z.string().min(1).max(60),
  email: z.string().email().max(255),
  city: z.string().max(160).optional().nullable(),
  projectName: z.string().max(255).optional().nullable(),
  website: z.string().max(500).optional().nullable(),
  paymentMethod: z.string().max(60).optional().nullable(),
  multipleListings: z.string().max(60).optional().nullable(),
  contentReady: z.string().max(60).optional().nullable(),
  paymentPlan: z.string().max(60).optional().nullable(),
  message: z.string().max(4000).optional().nullable(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const f = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const email = f.email.toLowerCase().trim();

    // Anti-doublon : une candidature en attente déjà enregistrée pour cet email ?
    const { data: existing } = await supabase
      .from("affiliates")
      .select("id, is_active")
      .eq("contact_email", email)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ ok: true, affiliate_id: existing.id, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pays par défaut : Maroc
    const { data: country } = await supabase
      .from("countries")
      .select("id")
      .eq("code", "MA")
      .maybeSingle();

    if (!country) {
      return new Response(JSON.stringify({ error: "default_country_missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inserted, error } = await supabase
      .from("affiliates")
      .insert({
        name: f.businessName.trim(),
        contact_name: `${f.firstName.trim()} ${f.lastName.trim()}`.trim(),
        contact_email: email,
        contact_phone: f.phone.trim(),
        phone: f.phone.trim(),
        contact_url: f.website?.trim() || null,
        country_id: country.id,
        is_active: false,
        max_businesses: f.multipleListings === "multiple" ? null : 1,
      })
      .select("id")
      .single();

    if (error) {
      console.error("affiliate insert failed", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Détail de la candidature conservé en note interne
    const noteLines = [
      "Candidature via /devenir-affilie",
      `Reçue le : ${new Date().toISOString()}`,
      `Ville : ${f.city || "-"}`,
      `Nom du projet : ${f.projectName || "-"}`,
      `Site web : ${f.website || "-"}`,
      `Moyen de paiement : ${f.paymentMethod || "-"}`,
      `Plan de paiement : ${f.paymentPlan || "-"}`,
      `Fiches souhaitées : ${f.multipleListings || "-"}`,
      `Contenus prêts : ${f.contentReady || "-"}`,
      `Message : ${f.message || "-"}`,
    ].join("\n");

    const { error: noteError } = await supabase
      .from("affiliate_internal_notes")
      .upsert({ affiliate_id: inserted.id, notes: noteLines }, { onConflict: "affiliate_id" });

    if (noteError) console.error("affiliate note failed", noteError);

    return new Response(JSON.stringify({ ok: true, affiliate_id: inserted.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("submit-affiliate-request error", e);
    return new Response(JSON.stringify({ error: "unexpected_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
