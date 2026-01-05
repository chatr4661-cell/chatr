/**
 * SMS Gateway Edge Function
 * Ready for Twilio/Vonage integration
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  to: string;
  body: string;
  from?: string;
  mediaUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, body, from, mediaUrl } = await req.json() as SMSRequest;

    console.log(`[SMS] Sending message to: ${to}`);
    console.log(`[SMS] Body: ${body.substring(0, 50)}...`);

    // Check for Twilio credentials
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !twilioNumber) {
      // Mock mode - return success without actually sending
      console.log('[SMS] Running in mock mode (no Twilio credentials)');
      
      return new Response(
        JSON.stringify({
          success: true,
          messageId: `mock_${Date.now()}`,
          status: 'queued',
          mock: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Real Twilio implementation
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('To', to);
    formData.append('From', from || twilioNumber);
    formData.append('Body', body);
    
    if (mediaUrl) {
      formData.append('MediaUrl', mediaUrl);
    }

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[SMS] Twilio error:', result);
      throw new Error(result.message || 'SMS send failed');
    }

    console.log(`[SMS] Message sent: ${result.sid}`);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.sid,
        status: result.status,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[SMS] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
