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

    console.log('Verifying OTP for phone:', phoneNumber)

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

    if (fetchError) {
      console.error('Error fetching OTP:', fetchError)
      throw new Error('Failed to verify OTP')
    }

    if (!otpRecords || otpRecords.length === 0) {
      console.log('No valid OTP found')
      throw new Error('Invalid or expired OTP')
    }

    console.log('Valid OTP found, marking as verified')

    // Mark OTP as verified
    await supabase
      .from('otp_verifications')
      .update({ verified: true })
      .eq('id', otpRecords[0].id)

    // Check if user exists in auth.users by phone
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      throw new Error('Failed to check user existence')
    }

    const existingUser = users.find(u => u.phone === phoneNumber)
    let userId: string
    let isNewUser = false

    if (existingUser) {
      console.log('User exists:', existingUser.id)
      userId = existingUser.id
      
      // Update profile with phone number if missing
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('id', userId)
        .maybeSingle()
      
      if (profile && !profile.phone_number) {
        await supabase
          .from('profiles')
          .update({ phone_number: phoneNumber })
          .eq('id', userId)
      }
    } else {
      console.log('Creating new user')
      
      // Create new user with phone
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        phone: phoneNumber,
        phone_confirm: true,
        email_confirm: true,
        user_metadata: { phone: phoneNumber }
      })

      if (createError) {
        console.error('Error creating user:', createError)
        throw new Error('Failed to create user account')
      }

      userId = newUser.user.id
      isNewUser = true
      console.log('New user created:', userId)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        isNewUser,
        phoneNumber 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
