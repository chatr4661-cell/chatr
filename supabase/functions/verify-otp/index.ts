import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phoneNumber, otpCode } = await req.json()
    
    if (!phoneNumber || !otpCode) {
      throw new Error('Phone number and OTP code are required')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Find valid OTP
    const { data: otpRecords, error: fetchError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('otp_code', otpCode)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (fetchError || !otpRecords || otpRecords.length === 0) {
      throw new Error('Invalid or expired OTP')
    }

    // Mark OTP as verified
    await supabase
      .from('otp_verifications')
      .update({ verified: true })
      .eq('id', otpRecords[0].id)

    // Check if user exists in auth.users
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers.users.find(u => u.phone === phoneNumber)

    let userId: string
    let session

    if (existingUser) {
      // User exists, create session
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: existingUser.email || `${phoneNumber.replace(/\+/g, '')}@chatr.local`,
      })

      if (sessionError) throw sessionError
      
      userId = existingUser.id
      // Return user data for client-side session creation
      return new Response(
        JSON.stringify({ 
          success: true, 
          userId,
          isNewUser: false,
          phoneNumber 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        phone: phoneNumber,
        phone_confirm: true,
        email: `${phoneNumber.replace(/\+/g, '')}@chatr.local`,
        email_confirm: true,
      })

      if (createError) throw createError
      userId = newUser.user.id

      return new Response(
        JSON.stringify({ 
          success: true, 
          userId,
          isNewUser: true,
          phoneNumber 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
