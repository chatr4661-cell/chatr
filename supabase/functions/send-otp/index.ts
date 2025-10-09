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
    const { phoneNumber } = await req.json()
    
    if (!phoneNumber) {
      throw new Error('Phone number is required')
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Store OTP in database
    const { error: dbError } = await supabase
      .from('otp_verifications')
      .insert({
        phone_number: phoneNumber,
        otp_code: otpCode,
      })

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error('Failed to store OTP')
    }

    // Send SMS via Twilio
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER')
    
    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error('Twilio credentials not configured')
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    
    const formData = new URLSearchParams()
    formData.append('To', phoneNumber)
    formData.append('From', twilioPhone)
    formData.append('Body', `Your CHATR verification code is: ${otpCode}`)

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    })

    if (!twilioResponse.ok) {
      const error = await twilioResponse.text()
      console.error('Twilio error:', error)
      throw new Error('Failed to send SMS')
    }

    return new Response(
      JSON.stringify({ success: true, message: 'OTP sent successfully' }),
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
