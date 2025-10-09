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

    // Check if profile exists by phone number
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone_number', phoneNumber)
      .maybeSingle()

    let userId: string
    let isNewUser = false

    if (existingProfile) {
      // Profile exists, use this user
      console.log('User profile exists:', existingProfile.id)
      userId = existingProfile.id
    } else {
      // No profile found, check if auth user exists
      console.log('No profile found, checking for auth user')
      
      const { data: { users } } = await supabase.auth.admin.listUsers()
      const existingAuthUser = users.find(u => u.phone === phoneNumber || u.email === `${phoneNumber.replace('+', '')}@chatr.local`)
      
      if (existingAuthUser) {
        // Auth user exists but no profile, create profile
        console.log('Found existing auth user without profile:', existingAuthUser.id)
        userId = existingAuthUser.id
        
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ 
            id: userId, 
            phone_number: phoneNumber,
            username: `User_${phoneNumber.slice(-4)}`,
            email: existingAuthUser.email
          })
        
        if (profileError) {
          console.error('Profile creation error:', profileError)
          throw new Error('Failed to create user profile')
        }
      } else {
        // No auth user exists, create new one
        console.log('Creating new auth user')
        
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          phone: phoneNumber,
          phone_confirm: true,
          email_confirm: true,
          email: `${phoneNumber.replace('+', '')}@chatr.local`,
          password: phoneNumber, // Use phone as password for phone-based auth
          user_metadata: { phone: phoneNumber }
        })

        if (createError) {
          console.error('Create user error:', createError)
          throw new Error('Failed to create user account')
        }

        userId = newUser.user.id
        isNewUser = true
        console.log('New user created:', userId)
      }
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
