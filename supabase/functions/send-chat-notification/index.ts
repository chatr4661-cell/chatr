import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ============================================================================
// FCM HTTP v1 API - Modern authenticated API (replaces dead legacy API)
// ============================================================================

function base64UrlEncode(str: string): string {
  const b64 = btoa(str);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function createJWT(serviceAccount: any): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging'
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const privateKey = serviceAccount.private_key;
  const pemContents = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  return `${unsignedToken}.${signatureB64}`;
}

async function getOAuth2AccessToken(serviceAccount: any): Promise<string> {
  const jwt = await createJWT(serviceAccount);
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firebaseServiceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');

    if (!firebaseServiceAccountJson) {
      console.error('❌ FIREBASE_SERVICE_ACCOUNT not configured');
      return new Response(
        JSON.stringify({ error: 'Firebase service account not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceAccount = JSON.parse(firebaseServiceAccountJson);
    const projectId = serviceAccount.project_id;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { senderId, senderName, senderAvatar, receiverId, conversationId, messageContent, messageId, isGroup } = await req.json();

    console.log('💬 Chat notification request (FCM v1) - Sender:', senderId, 'Receiver:', receiverId);

    if (!receiverId || !conversationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: receiverId, conversationId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get OAuth2 access token for FCM v1 API
    const accessToken = await getOAuth2AccessToken(serviceAccount);

    // Get all FCM tokens for the receiver
    const { data: deviceTokens, error: tokenError } = await supabase
      .from('device_tokens')
      .select('device_token, platform')
      .eq('user_id', receiverId);

    if (tokenError) {
      console.error('Error fetching device tokens:', tokenError);
      throw tokenError;
    }

    if (!deviceTokens || deviceTokens.length === 0) {
      console.log('⚠️ No FCM tokens found for user:', receiverId);
      return new Response(
        JSON.stringify({ message: 'No FCM tokens registered for recipient' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📱 Found', deviceTokens.length, 'device(s) for recipient');

    const truncatedContent = messageContent && messageContent.length > 100
      ? messageContent.substring(0, 100) + '...'
      : (messageContent || 'Sent a message');

    const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    const results = await Promise.allSettled(
      deviceTokens.map(async (tokenData: any) => {
        // DATA-ONLY payload — Android native app handles notification display
        const fcmPayload = {
          message: {
            token: tokenData.device_token,
            data: {
              type: "chat_message",
              title: senderName || "New Message",
              body: truncatedContent,
              sender_id: senderId || "",
              sender_name: senderName || "Unknown",
              sender_avatar: senderAvatar || "",
              conversation_id: conversationId,
              message_id: messageId || crypto.randomUUID(),
              is_group: String(isGroup || false),
              timestamp: Date.now().toString()
            },
            android: {
              priority: "HIGH"
            }
          }
        };

        const maskedToken = tokenData.device_token.length > 16
          ? tokenData.device_token.substring(0, 8) + '...' + tokenData.device_token.substring(tokenData.device_token.length - 8)
          : tokenData.device_token;

        console.log('[FCM-v1] Sending to:', maskedToken);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(fcmPayload),
        });

        const responseBody = await response.text();

        console.log('[FCM-v1] Response:', response.status, responseBody.substring(0, 200));

        if (!response.ok) {
          // Remove invalid tokens
          if (responseBody.includes('UNREGISTERED') || responseBody.includes('INVALID_ARGUMENT')) {
            console.log('🗑️ Removing invalid token from database');
            await supabase.from('device_tokens').delete().eq('device_token', tokenData.device_token);
          }
          throw new Error(`${response.status}: ${responseBody}`);
        }

        // Update last_used_at
        await supabase
          .from('device_tokens')
          .update({ last_used_at: new Date().toISOString() })
          .eq('device_token', tokenData.device_token);

        return JSON.parse(responseBody);
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Chat notification (FCM v1) sent to ${successful} device(s), failed: ${failed}`);

    return new Response(
      JSON.stringify({ success: true, sentTo: successful, failed, api: 'v1' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error sending chat notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
