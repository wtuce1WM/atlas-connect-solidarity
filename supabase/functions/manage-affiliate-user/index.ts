import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ManageAffiliateRequest {
  action: "create" | "reset_password" | "delete";
  affiliate_id: string;
  email?: string;
  password?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    // Verify the calling user is staff or admin
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

    // Check if calling user is staff or admin
    const { data: callerRoles, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id)
      .in("role", ["admin", "staff"]);

    if (roleError || !callerRoles || callerRoles.length === 0) {
      throw new Error("Only staff or admins can manage affiliate users");
    }

    // Parse request body
    const { action, affiliate_id, email, password }: ManageAffiliateRequest = await req.json();

    if (!action || !affiliate_id) {
      throw new Error("Missing required fields: action, affiliate_id");
    }

    // Fetch the affiliate
    const { data: affiliate, error: affiliateError } = await supabaseAdmin
      .from("affiliates")
      .select("id, user_id, name, contact_email")
      .eq("id", affiliate_id)
      .single();

    if (affiliateError || !affiliate) {
      throw new Error("Affiliate not found");
    }

    if (action === "create") {
      // Create new user account for affiliate
      if (!email || !password) {
        throw new Error("Email and password are required to create an account");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      if (affiliate.user_id) {
        throw new Error("This affiliate already has an account");
      }

      // Create the user
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: email.toLowerCase().trim(),
          password,
          email_confirm: true, // Auto-confirm email for affiliate users
        });

      if (createError) {
        throw new Error(createError.message);
      }

      if (!newUser.user) {
        throw new Error("Failed to create user");
      }

      // Assign affiliate role to the new user
      const { error: roleInsertError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: newUser.user.id,
          role: "affiliate",
        });

      if (roleInsertError) {
        // Rollback: delete the user if role assignment fails
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        throw new Error("Failed to assign role: " + roleInsertError.message);
      }

      // Link user to affiliate
      const { error: linkError } = await supabaseAdmin
        .from("affiliates")
        .update({ user_id: newUser.user.id })
        .eq("id", affiliate_id);

      if (linkError) {
        // Rollback: delete user and role
        await supabaseAdmin.from("user_roles").delete().eq("user_id", newUser.user.id);
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        throw new Error("Failed to link user to affiliate: " + linkError.message);
      }

      console.log(`Created affiliate user account for ${affiliate.name}: ${email}`);

      return new Response(
        JSON.stringify({
          success: true,
          action: "create",
          user_id: newUser.user.id,
          email: newUser.user.email,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else if (action === "reset_password") {
      // Reset password for existing affiliate user
      if (!password) {
        throw new Error("New password is required");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      if (!affiliate.user_id) {
        throw new Error("This affiliate does not have an account yet");
      }

      // Update the user's password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        affiliate.user_id,
        { password }
      );

      if (updateError) {
        throw new Error("Failed to reset password: " + updateError.message);
      }

      console.log(`Reset password for affiliate: ${affiliate.name}`);

      return new Response(
        JSON.stringify({
          success: true,
          action: "reset_password",
          user_id: affiliate.user_id,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else if (action === "delete") {
      // Delete user account (but keep affiliate record)
      if (!affiliate.user_id) {
        throw new Error("This affiliate does not have an account");
      }

      const userId = affiliate.user_id;

      // Remove user_id from affiliate first
      const { error: unlinkError } = await supabaseAdmin
        .from("affiliates")
        .update({ user_id: null })
        .eq("id", affiliate_id);

      if (unlinkError) {
        throw new Error("Failed to unlink user from affiliate: " + unlinkError.message);
      }

      // Delete user role
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

      // Delete the auth user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error("Failed to delete auth user:", deleteError);
        // Don't throw - affiliate is already unlinked
      }

      console.log(`Deleted user account for affiliate: ${affiliate.name}`);

      return new Response(
        JSON.stringify({
          success: true,
          action: "delete",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      throw new Error("Invalid action. Must be 'create', 'reset_password', or 'delete'");
    }
  } catch (error: any) {
    console.error("Error managing affiliate user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
