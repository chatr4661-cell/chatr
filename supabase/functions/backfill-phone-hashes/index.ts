import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Hash phone number using SHA-256
async function hashPhoneNumber(phone: string): Promise<string> {
  const normalized = phone.replace(/\D/g, ''); // Remove non-digits
  const msgBuffer = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all profiles with phone_number but no phone_hash
    const { data: profiles, error: fetchError } = await supabaseClient
      .from('profiles')
      .select('id, phone_number')
      .not('phone_number', 'is', null)
      .or('phone_hash.is.null,phone_hash.eq.')

    if (fetchError) {
      throw fetchError
    }

    let updated = 0
    let failed = 0

    // Update each profile with phone hash
    for (const profile of profiles || []) {
      try {
        const phoneHash = await hashPhoneNumber(profile.phone_number)
        
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({ phone_hash: phoneHash })
          .eq('id', profile.id)

        if (updateError) {
          console.error(`Failed to update ${profile.id}:`, updateError)
          failed++
        } else {
          updated++
        }
      } catch (err) {
        console.error(`Error processing ${profile.id}:`, err)
        failed++
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${updated} profiles, ${failed} failed`,
        total: profiles?.length || 0
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }
})
