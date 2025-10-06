import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, inviterName } = await req.json();

    console.log('📞 Sending WhatsApp invite to:', phoneNumber);

    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    // Get Twilio credentials from environment
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioWhatsAppNumber = 'whatsapp:+14155238886'; // Twilio WhatsApp sandbox number

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }

    // Format phone number for WhatsApp (ensure it has country code)
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const whatsappTo = `whatsapp:${formattedPhone}`;

    // Create invite link (this would be your app's deep link)
    const appUrl = Deno.env.get('SUPABASE_URL') || 'https://chatr.app';
    const inviteLink = `${appUrl}/join?referrer=${encodeURIComponent(inviterName || 'a friend')}`;

    // Create message body
    const messageBody = `Hey! ${inviterName || 'Your friend'} invited you to join Chatr+ 💬

Chatr+ is a secure messaging platform with:
✨ End-to-end encrypted chats
📞 Voice & video calls
🎯 Smart AI features
🌍 Auto-translation

Join now: ${inviteLink}

Start chatting instantly!`;

    // Send WhatsApp message via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('From', twilioWhatsAppNumber);
    formData.append('To', whatsappTo);
    formData.append('Body', messageBody);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('❌ Twilio error:', twilioData);
      throw new Error(twilioData.message || 'Failed to send WhatsApp message');
    }

    console.log('✅ WhatsApp invite sent successfully:', twilioData.sid);

    return new Response(
      JSON.stringify({
        success: true,
        messageSid: twilioData.sid,
        message: 'WhatsApp invite sent successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error sending WhatsApp invite:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
