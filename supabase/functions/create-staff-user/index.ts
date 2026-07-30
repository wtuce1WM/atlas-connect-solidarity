import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  role: "admin" | "staff" | "video_studio";
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the calling user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: callingUser },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !callingUser) {
      throw new Error("Invalid authentication");
    }

    // Check if calling user is admin
    const { data: callerRoles, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id)
      .eq("role", "admin");

    if (roleError || !callerRoles || callerRoles.length === 0) {
      throw new Error("Only admins can create users");
    }

    // Parse request body
    const { email, password, role }: CreateUserRequest = await req.json();

    if (!email || !password || !role) {
      throw new Error("Missing required fields: email, password, role");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Create the user
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password,
        email_confirm: true, // Auto-confirm email for staff users
      });

    if (createError) {
      throw new Error(createError.message);
    }

    if (!newUser.user) {
      throw new Error("Failed to create user");
    }

    // Assign role to the new user
    const { error: roleInsertError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role: role,
      });

    if (roleInsertError) {
      // Rollback: delete the user if role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error("Failed to assign role: " + roleInsertError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUser.user.id,
        email: newUser.user.email,
        role: role,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error creating staff user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
