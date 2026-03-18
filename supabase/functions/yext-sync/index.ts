import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const YEXT_BASE = "https://api.yextapis.com/v2/accounts/me";
const YEXT_API_VERSION = "20231201";

interface YextLocation {
  name: string;
  address?: {
    line1?: string;
    city?: string;
    region?: string;
    countryCode?: string;
  };
  mainPhone?: string;
  emails?: string[];
  websiteUrl?: { url: string };
  facebookVanityUrl?: string;
  instagramHandle?: string;
  twitterHandle?: string;
  googlePlaceId?: string;
  hours?: Record<string, unknown>;
}

function buildYextEntity(business: any): YextLocation {
  const entity: YextLocation = { name: business.name };

  // Address
  if (business.address || business.city || business.country) {
    entity.address = {
      line1: business.address || undefined,
      city: business.city || undefined,
      countryCode: business.country === "Maroc" ? "MA" : "MA",
    };
  }

  // Phone
  if (business.phone) entity.mainPhone = business.phone;

  // Email
  if (business.email) entity.emails = [business.email];

  // Website
  if (business.website) entity.websiteUrl = { url: business.website };

  // Social
  if (business.facebook_url) {
    const match = business.facebook_url.match(/facebook\.com\/([^/?]+)/);
    if (match) entity.facebookVanityUrl = match[1];
  }
  if (business.instagram_url) {
    const match = business.instagram_url.match(/instagram\.com\/([^/?]+)/);
    if (match) entity.instagramHandle = match[1];
  }
  if (business.twitter_url) {
    const match = business.twitter_url.match(/(?:twitter|x)\.com\/([^/?]+)/);
    if (match) entity.twitterHandle = match[1];
  }

  // Opening hours → Yext hours format
  if (business.opening_hours) {
    const dayMap: Record<string, string> = {
      monday: "monday",
      tuesday: "tuesday",
      wednesday: "wednesday",
      thursday: "thursday",
      friday: "friday",
      saturday: "saturday",
      sunday: "sunday",
    };
    const hours: Record<string, any> = {};
    for (const [day, yextDay] of Object.entries(dayMap)) {
      const dayData = business.opening_hours[day];
      if (dayData?.closed) {
        hours[yextDay] = { isClosed: true };
      } else if (dayData?.open && dayData?.close) {
        hours[yextDay] = {
          openIntervals: [{ start: dayData.open, end: dayData.close }],
        };
      }
    }
    if (Object.keys(hours).length > 0) entity.hours = hours;
  }

  return entity;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const YEXT_API_KEY = Deno.env.get("YEXT_API_KEY");
    if (!YEXT_API_KEY) {
      return new Response(
        JSON.stringify({ error: "YEXT_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { businessId, action } = await req.json();

    if (!businessId) {
      return new Response(JSON.stringify({ error: "businessId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify affiliate ownership
    const { data: isOwner } = await supabase.rpc("is_own_affiliate_business", {
      _user_id: user.id,
      _business_id: businessId,
    });

    if (!isOwner) {
      return new Response(JSON.stringify({ error: "Not your business" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch business data
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      return new Response(JSON.stringify({ error: "Business not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const yextEntity = buildYextEntity(business);

    if (action === "status") {
      // Try to GET the entity to check if it exists and its status
      const statusUrl = `${YEXT_BASE}/entities/${businessId}?api_key=${YEXT_API_KEY}&v=${YEXT_API_VERSION}`;
      const statusRes = await fetch(statusUrl);
      const statusBody = await statusRes.json();

      if (!statusRes.ok) {
        return new Response(
          JSON.stringify({ synced: false, status: "not_found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ synced: true, status: "live", entity: statusBody.response }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try UPDATE first, if 404, CREATE
    const updateUrl = `${YEXT_BASE}/entities/${businessId}?api_key=${YEXT_API_KEY}&v=${YEXT_API_VERSION}`;
    const updateRes = await fetch(updateUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(yextEntity),
    });

    let result;
    if (updateRes.status === 404) {
      // Entity doesn't exist yet — create it
      const createUrl = `${YEXT_BASE}/entities?entityType=location&api_key=${YEXT_API_KEY}&v=${YEXT_API_VERSION}`;
      const createRes = await fetch(createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...yextEntity, meta: { id: businessId } }),
      });
      result = await createRes.json();

      if (!createRes.ok) {
        return new Response(
          JSON.stringify({ error: "Yext create failed", details: result }),
          { status: createRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      result = await updateRes.json();
      if (!updateRes.ok) {
        return new Response(
          JSON.stringify({ error: "Yext update failed", details: result }),
          { status: updateRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("yext-sync error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
