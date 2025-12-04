import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GoogleContact {
  resourceName: string;
  names?: Array<{ displayName: string }>;
  emailAddresses?: Array<{ value: string }>;
  phoneNumbers?: Array<{ value: string }>;
  photos?: Array<{ url: string }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider_token } = await req.json();
    
    if (!provider_token) {
      throw new Error("Missing provider_token");
    }

    // Initialize Supabase client
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

    // Fetch Google contacts using People API
    const contactsResponse = await fetch(
      "https://people.googleapis.com/v1/people/me/connections?" +
      "personFields=names,emailAddresses,phoneNumbers,photos&pageSize=1000",
      {
        headers: {
          Authorization: `Bearer ${provider_token}`,
        },
      }
    );

    if (!contactsResponse.ok) {
      const errorText = await contactsResponse.text();
      console.error("Google API error:", errorText);
      throw new Error(`Google API error: ${contactsResponse.status}`);
    }

    const contactsData = await contactsResponse.json();
    const connections: GoogleContact[] = contactsData.connections || [];

    console.log(`Found ${connections.length} Google contacts`);

    // Process and store contacts
    const importedContacts = [];
    const chatrUserEmails: string[] = [];
    const chatrUserPhones: string[] = [];

    for (const contact of connections) {
      const name = contact.names?.[0]?.displayName || "Unknown";
      const email = contact.emailAddresses?.[0]?.value?.toLowerCase();
      const phone = contact.phoneNumbers?.[0]?.value?.replace(/\D/g, "");
      const photo = contact.photos?.[0]?.url;

      if (!email && !phone) continue;

      if (email) chatrUserEmails.push(email);
      if (phone) chatrUserPhones.push(phone);

      importedContacts.push({
        user_id: user.id,
        google_contact_id: contact.resourceName,
        name,
        email: email || null,
        phone: phone || null,
        photo_url: photo || null,
        is_chatr_user: false,
        chatr_user_id: null,
      });
    }

    // Check which contacts are already on CHATR
    const { data: existingUsers } = await supabase
      .from("profiles")
      .select("id, email, phone_number")
      .or(`email.in.(${chatrUserEmails.join(",")}),phone_number.in.(${chatrUserPhones.join(",")})`);

    const chatrUserMap = new Map();
    existingUsers?.forEach((u) => {
      if (u.email) chatrUserMap.set(u.email.toLowerCase(), u.id);
      if (u.phone_number) chatrUserMap.set(u.phone_number.replace(/\D/g, ""), u.id);
    });

    // Update contacts with CHATR user status
    for (const contact of importedContacts) {
      const chatrUserId = chatrUserMap.get(contact.email) || chatrUserMap.get(contact.phone);
      if (chatrUserId && chatrUserId !== user.id) {
        contact.is_chatr_user = true;
        contact.chatr_user_id = chatrUserId;
      }
    }

    // Upsert contacts (handle duplicates)
    let insertedCount = 0;
    let updatedCount = 0;

    for (const contact of importedContacts) {
      const { error } = await supabase
        .from("gmail_imported_contacts")
        .upsert(contact, {
          onConflict: contact.email ? "user_id,email" : "user_id,phone",
          ignoreDuplicates: false,
        });

      if (!error) {
        insertedCount++;
      }
    }

    // Get final stats
    const { data: finalContacts } = await supabase
      .from("gmail_imported_contacts")
      .select("*")
      .eq("user_id", user.id);

    const onChatr = finalContacts?.filter((c) => c.is_chatr_user).length || 0;
    const notOnChatr = (finalContacts?.length || 0) - onChatr;

    return new Response(
      JSON.stringify({
        success: true,
        total_imported: finalContacts?.length || 0,
        on_chatr: onChatr,
        to_invite: notOnChatr,
        contacts: finalContacts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error syncing contacts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
