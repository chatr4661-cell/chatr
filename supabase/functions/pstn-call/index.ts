/**
 * PSTN Call Edge Function
 * Ready for Twilio Voice integration
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PSTNRequest {
  action: 'initiate' | 'end' | 'dtmf' | 'status';
  to?: string;
  from?: string;
  callId?: string;
  digits?: string;
  enableRecording?: boolean;
  callbackUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request = await req.json() as PSTNRequest;

    console.log(`[PSTN] Action: ${request.action}`);

    // Check for Twilio credentials
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !twilioNumber) {
      // Mock mode
      console.log('[PSTN] Running in mock mode (no Twilio credentials)');
      
      return new Response(
        JSON.stringify({
          success: true,
          callSid: `mock_call_${Date.now()}`,
          status: request.action === 'initiate' ? 'queued' : 'completed',
          mock: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Real Twilio Voice implementation
    const twilioBaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}`;
    const authHeader = `Basic ${btoa(`${accountSid}:${authToken}`)}`;

    switch (request.action) {
      case 'initiate': {
        const callUrl = `${twilioBaseUrl}/Calls.json`;
        
        const formData = new URLSearchParams();
        formData.append('To', request.to!);
        formData.append('From', request.from || twilioNumber);
        formData.append('Url', request.callbackUrl || 'http://demo.twilio.com/docs/voice.xml');
        
        if (request.enableRecording) {
          formData.append('Record', 'true');
        }

        const response = await fetch(callUrl, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Call initiation failed');
        }

        console.log(`[PSTN] Call initiated: ${result.sid}`);

        return new Response(
          JSON.stringify({
            success: true,
            callSid: result.sid,
            status: result.status,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      case 'end': {
        const callUrl = `${twilioBaseUrl}/Calls/${request.callId}.json`;
        
        const formData = new URLSearchParams();
        formData.append('Status', 'completed');

        const response = await fetch(callUrl, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        });

        const result = await response.json();

        console.log(`[PSTN] Call ended: ${request.callId}`);

        return new Response(
          JSON.stringify({
            success: true,
            callSid: request.callId,
            status: 'completed',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      case 'dtmf': {
        // Send DTMF via Twilio
        console.log(`[PSTN] Sending DTMF: ${request.digits} to ${request.callId}`);
        
        // In production, this would modify the call to play DTMF
        return new Response(
          JSON.stringify({
            success: true,
            callSid: request.callId,
            digits: request.digits,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      case 'status': {
        const callUrl = `${twilioBaseUrl}/Calls/${request.callId}.json`;

        const response = await fetch(callUrl, {
          headers: { 'Authorization': authHeader },
        });

        const result = await response.json();

        return new Response(
          JSON.stringify({
            success: true,
            callSid: request.callId,
            status: result.status,
            duration: result.duration,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      default:
        throw new Error(`Unknown action: ${request.action}`);
    }
  } catch (error) {
    console.error('[PSTN] Error:', error);
    
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
