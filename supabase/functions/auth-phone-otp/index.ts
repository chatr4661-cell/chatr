import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { phoneNumber, action, firebaseUid, otp } = body;

    console.log("Auth phone OTP request:", { phoneNumber, action, hasFirebaseUid: !!firebaseUid });

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: "Phone number required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: send - Firebase handles OTP sending on client, just acknowledge
    if (action === "send") {
      console.log("OTP send request acknowledged for:", phoneNumber);
      return new Response(
        JSON.stringify({ success: true, message: "OTP will be sent via Firebase" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: verify - Create/update Supabase user and return session
    if (action === "verify") {
      const uid = firebaseUid || otp;
      
      if (!uid) {
        return new Response(
          JSON.stringify({ error: "Firebase UID required for verification" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const normalizedPhone = phoneNumber.replace(/\s/g, "").replace(/\+/g, "");
      const email = `${normalizedPhone}@chatr.local`;
      const password = phoneNumber.replace(/\s/g, "");

      // Check if user exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === email);

      let session;
      let user;
      let isNewUser = false;

      if (existingUser) {
        console.log("Existing user found, updating...");
        
        // Update password and sign in
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password: password,
          user_metadata: { 
            phone_number: phoneNumber, 
            firebase_uid: uid,
            username: normalizedPhone.slice(-10)
          }
        });

        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? ""
        );

        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("Sign in error:", error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        session = data.session;
        user = data.user;
      } else {
        console.log("Creating new user...");
        
        // Create new user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { 
            phone_number: phoneNumber, 
            firebase_uid: uid,
            username: normalizedPhone.slice(-10)
          }
        });

        if (createError) {
          console.error("Create user error:", createError);
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        isNewUser = true;

        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? ""
        );

        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("Sign in after create error:", error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        session = data.session;
        user = data.user;
      }

      console.log("Login successful for:", phoneNumber, "isNewUser:", isNewUser);

      // Return in format Android app expects (AuthResponse)
      return new Response(
        JSON.stringify({
          accessToken: session?.access_token,
          refreshToken: session?.refresh_token,
          expiresIn: session?.expires_in || 3600,
          user: {
            id: user?.id,
            email: user?.email,
            phone: phoneNumber,
            username: user?.user_metadata?.username || normalizedPhone.slice(-10),
            avatarUrl: user?.user_metadata?.avatar_url || null,
            bio: user?.user_metadata?.bio || null,
            isOnline: true,
            lastSeen: new Date().toISOString(),
            createdAt: user?.created_at
          },
          isNewUser
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'send' or 'verify'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
