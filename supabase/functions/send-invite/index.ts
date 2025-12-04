import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { contact_name, contact_email, contact_phone, invite_method } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) throw new Error("Unauthorized");

    // Get inviter's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .single();

    const inviterName = profile?.username || "A friend";

    // Generate unique invite code
    const inviteCode = `CHATR-${user.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const inviteLink = `https://chatr.chat/join?invite=${inviteCode}`;

    // Check if already invited
    const existingQuery = supabase.from("contact_invites").select("*").eq("inviter_id", user.id);
    if (contact_email) existingQuery.eq("contact_email", contact_email);
    if (contact_phone) existingQuery.eq("contact_phone", contact_phone);
    
    const { data: existing } = await existingQuery.maybeSingle();
    
    if (existing && existing.status === "joined") {
      return new Response(
        JSON.stringify({ success: false, message: "This contact already joined!" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create or update invite record
    const { error: inviteError } = await supabase.from("contact_invites").upsert({
      inviter_id: user.id,
      contact_name,
      contact_email: contact_email || null,
      contact_phone: contact_phone || null,
      invite_method,
      invite_code: inviteCode,
      status: "sent",
      sent_at: new Date().toISOString(),
    }, {
      onConflict: contact_email ? "inviter_id,contact_email" : "inviter_id,contact_phone",
    });

    if (inviteError) throw inviteError;

    // Send invite based on method
    let message = "";

    if (invite_method === "email" && contact_email) {
      // Send email via Resend API
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      
      if (resendApiKey) {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Chatr <invites@chatr.chat>",
            to: [contact_email],
            subject: `${inviterName} invited you to join Chatr! 🎉`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #6366f1; margin-bottom: 10px;">You're Invited to Chatr! 🚀</h1>
                </div>
                
                <p style="font-size: 16px; color: #333;">Hey ${contact_name || "there"}!</p>
                
                <p style="font-size: 16px; color: #333;">
                  <strong>${inviterName}</strong> thinks you'd love Chatr - India's super app for 
                  messaging, local services, jobs, healthcare, and more!
                </p>
                
                <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); 
                            border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0;">
                  <p style="color: white; font-size: 18px; margin-bottom: 20px;">
                    Join now and both of you get <strong>50 Chatr Coins!</strong> 🪙
                  </p>
                  <a href="${inviteLink}" 
                     style="background: white; color: #6366f1; padding: 15px 40px; 
                            border-radius: 30px; text-decoration: none; font-weight: bold;
                            font-size: 16px; display: inline-block;">
                    Join Chatr Now
                  </a>
                </div>
                
                <p style="font-size: 14px; color: #666; text-align: center;">
                  Your invite code: <strong>${inviteCode}</strong>
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #999; text-align: center;">
                  Chatr - Connect, Discover, Thrive 🌟<br>
                  <a href="https://chatr.chat" style="color: #6366f1;">chatr.chat</a>
                </p>
              </div>
            `,
          }),
        });

        if (emailResponse.ok) {
          message = "Email invite sent successfully!";
        } else {
          message = "Email invite created (delivery pending)";
        }
      } else {
        message = "Invite created - share via WhatsApp";
      }
    } else if (invite_method === "sms" && contact_phone) {
      // Send SMS via Twilio
      const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

      if (twilioSid && twilioToken && twilioPhone) {
        const formattedPhone = contact_phone.startsWith("+") ? contact_phone : `+91${contact_phone}`;
        
        const smsResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: formattedPhone,
              From: twilioPhone,
              Body: `🎉 ${inviterName} invited you to Chatr! India's super app for messaging, jobs, healthcare & more. Join now & get 50 coins! ${inviteLink}`,
            }),
          }
        );

        if (smsResponse.ok) {
          message = "SMS invite sent successfully!";
        } else {
          message = "SMS invite created (use WhatsApp as backup)";
        }
      } else {
        message = "Invite created - share via WhatsApp";
      }
    } else if (invite_method === "whatsapp") {
      // For WhatsApp, we just return the link for the user to share
      message = "WhatsApp invite ready to share!";
    }

    return new Response(
      JSON.stringify({
        success: true,
        invite_code: inviteCode,
        invite_link: inviteLink,
        message,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending invite:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
