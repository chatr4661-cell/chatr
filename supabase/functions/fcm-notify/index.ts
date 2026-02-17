import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MessageNotification {
  type: 'message';
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  conversationId: string;
  messageContent: string;
  messageId: string;
  isGroup?: boolean;
}

interface CallNotification {
  type: 'call';
  receiverId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callerPhone?: string;
  callId: string;
  callType: 'audio' | 'video';
  conversationId?: string;
}

type NotificationPayload = MessageNotification | CallNotification;

// ============================================================================
// FCM HTTP v1 API IMPLEMENTATION
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
  console.log('[FCM-v1] Generating OAuth2 access token...');
  
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
    console.error('[FCM-v1] OAuth2 token error:', error);
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  console.log('[FCM-v1] OAuth2 token obtained successfully');
  return data.access_token;
}

/**
 * Send FCM HTTP v1 API message for incoming calls
 * CRITICAL: DATA-ONLY payload, NO notification blocks
 */
async function sendFCMv1Call(
  projectId: string,
  accessToken: string,
  fcmToken: string,
  callData: {
    callId: string;
    callerId: string;
    callerName: string;
    callerAvatar: string;
    callerPhone: string;
    isVideo: boolean;
    conversationId: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  
  // EXACT PAYLOAD FORMAT - DATA-ONLY, NO notification blocks!
  // CRITICAL: Include caller_phone for Android tel: URI (not user_id)
  const fcmPayload = {
    message: {
      token: fcmToken,
      android: {
        priority: "HIGH",
        ttl: "30s"
      },
      data: {
        type: "call",
        call_id: callData.callId,
        caller_id: callData.callerId,
        caller_name: callData.callerName || "Unknown",
        caller_avatar: callData.callerAvatar || "",
        caller_phone: callData.callerPhone || "",
        is_video: callData.isVideo ? "true" : "false",
        conversation_id: callData.conversationId || "",
        timestamp: Date.now().toString()
      }
    }
  };

  // DEBUG LOGGING (MANDATORY)
  const maskedToken = fcmToken.length > 16 
    ? fcmToken.substring(0, 8) + '...' + fcmToken.substring(fcmToken.length - 8)
    : fcmToken;
  
  console.log('[FCM-v1] ========== OUTGOING CALL FCM ==========');
  console.log('[FCM-v1] Endpoint:', endpoint);
  console.log('[FCM-v1] Target Token (masked):', maskedToken);
  console.log('[FCM-v1] Payload:', JSON.stringify(fcmPayload, null, 2));
  console.log('[FCM-v1] ==========================================');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(fcmPayload)
  });

  const responseBody = await response.text();
  
  console.log('[FCM-v1] ========== FCM RESPONSE ==========');
  console.log('[FCM-v1] HTTP Status:', response.status);
  console.log('[FCM-v1] Response Body:', responseBody);
  console.log('[FCM-v1] ===================================');

  if (!response.ok) {
    return { success: false, error: `${response.status}: ${responseBody}` };
  }

  const result = JSON.parse(responseBody);
  return { success: true, messageId: result.name };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload = await req.json() as NotificationPayload;

    console.log('📲 FCM Notification Request:', payload.type);

    if (payload.type === 'message') {
      return await handleMessageNotification(supabase, payload);
    } else if (payload.type === 'call') {
      return await handleCallNotificationV1(supabase, payload);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid notification type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ Error in fcm-notify:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleMessageNotification(
  supabase: any,
  payload: MessageNotification
) {
  const { recipientId, senderId, senderName, senderAvatar, conversationId, messageContent, messageId, isGroup } = payload;
  const firebaseServerKey = Deno.env.get('FIREBASE_SERVER_KEY');

  console.log('💬 Processing message notification for recipient:', recipientId);

  if (!firebaseServerKey) {
    console.error('❌ FIREBASE_SERVER_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'Firebase server key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data: deviceTokens, error: tokenError } = await supabase
    .from('device_tokens')
    .select('device_token, platform')
    .eq('user_id', recipientId);

  if (tokenError) {
    console.error('Error fetching device tokens:', tokenError);
    throw tokenError;
  }

  if (!deviceTokens || deviceTokens.length === 0) {
    console.log('⚠️ No FCM tokens found for recipient:', recipientId);
    return new Response(
      JSON.stringify({ success: false, message: 'No device tokens found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('📱 Found', deviceTokens.length, 'device(s) for recipient');

  const messageData = {
    id: messageId,
    conversationId,
    senderId,
    content: messageContent,
    createdAt: new Date().toISOString()
  };

  const senderData = {
    id: senderId,
    username: senderName,
    avatar_url: senderAvatar || ''
  };

  const results = await Promise.allSettled(
    deviceTokens.map(async (tokenData: any) => {
      const fcmPayload = {
        to: tokenData.device_token,
        priority: 'high',
        data: {
          type: 'message',
          conversation_id: conversationId,
          message: JSON.stringify(messageData),
          sender: JSON.stringify(senderData),
          is_group: String(isGroup || false),
          is_silent: 'false'
        },
        android: { priority: 'high' },
        content_available: true
      };

      console.log('📤 Sending MESSAGE FCM to:', tokenData.device_token.substring(0, 30) + '...');

      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${firebaseServerKey}`,
        },
        body: JSON.stringify(fcmPayload),
      });

      const result = await response.json();
      
      if (!response.ok || result.failure > 0) {
        console.error('❌ FCM Error:', result);
        if (result.results?.[0]?.error === 'NotRegistered' || 
            result.results?.[0]?.error === 'InvalidRegistration') {
          console.log('🗑️ Removing invalid token');
          await supabase.from('device_tokens').delete().eq('device_token', tokenData.device_token);
        }
        throw new Error(result.results?.[0]?.error || 'FCM failed');
      }

      console.log('✅ FCM Success:', result);
      await supabase.from('device_tokens').update({ last_used_at: new Date().toISOString() }).eq('device_token', tokenData.device_token);
      return result;
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`✅ Message notification sent to ${successful} device(s), failed: ${failed}`);

  return new Response(
    JSON.stringify({ success: true, sentTo: successful, failed }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * CRITICAL: FCM HTTP v1 API for WhatsApp-style incoming calls
 * 
 * MANDATORY REQUIREMENTS:
 * 1. Use FCM HTTP v1 API (POST https://fcm.googleapis.com/v1/projects/{PROJECT_ID}/messages:send)
 * 2. DATA-ONLY payload (NO notification blocks anywhere)
 * 3. TOKEN-based sending (one device per request)
 * 4. Android priority HIGH
 * 5. TTL ≤ 30 seconds
 */
async function handleCallNotificationV1(
  supabase: any,
  payload: CallNotification
) {
  const { receiverId, callerId, callerName, callerAvatar, callerPhone, callId, callType, conversationId } = payload;
  const startTime = Date.now();

  console.log('📞 Processing CALL notification (FCM v1) for receiver:', receiverId);
  console.log('📞 Call type:', callType, '| Call ID:', callId);
  console.log('📞 Caller phone:', callerPhone || 'not provided');

  // Get Firebase service account for OAuth2
  const firebaseServiceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  
  if (!firebaseServiceAccountJson) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT not configured - cannot use FCM v1 API');
    console.log('⚠️ Falling back to legacy FCM API (not recommended for calls)');
    // Log validation failure
    await logDeliveryResult(supabase, {
      callId, receiverId, callerId, tokensFound: 0, tokensSent: 0, tokensFailed: 0,
      status: 'config_error', error: 'FIREBASE_SERVICE_ACCOUNT not configured',
      apiVersion: 'legacy_fallback', latencyMs: Date.now() - startTime,
    });
    return await handleCallNotificationLegacy(supabase, payload);
  }

  const serviceAccount = JSON.parse(firebaseServiceAccountJson);
  const projectId = serviceAccount.project_id;

  console.log('[FCM-v1] Using Firebase Project:', projectId);

  // Get OAuth2 access token
  const accessToken = await getOAuth2AccessToken(serviceAccount);

  // Get all FCM tokens for the receiver
  const { data: deviceTokens, error: tokenError } = await supabase
    .from('device_tokens')
    .select('device_token, platform')
    .eq('user_id', receiverId);

  if (tokenError) {
    console.error('Error fetching device tokens:', tokenError);
    await logDeliveryResult(supabase, {
      callId, receiverId, callerId, tokensFound: 0, tokensSent: 0, tokensFailed: 0,
      status: 'token_fetch_error', error: tokenError.message,
      apiVersion: 'v1', latencyMs: Date.now() - startTime,
    });
    throw tokenError;
  }

  if (!deviceTokens || deviceTokens.length === 0) {
    console.log('⚠️ No FCM tokens found for receiver:', receiverId);
    await logDeliveryResult(supabase, {
      callId, receiverId, callerId, tokensFound: 0, tokensSent: 0, tokensFailed: 0,
      status: 'no_tokens', error: 'No device tokens registered for receiver',
      apiVersion: 'v1', latencyMs: Date.now() - startTime,
    });
    return new Response(
      JSON.stringify({ success: false, message: 'No device tokens found', validation: { status: 'no_tokens', tokensFound: 0 } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('📱 Found', deviceTokens.length, 'device(s) for call receiver');

  const callData = {
    callId,
    callerId,
    callerName: callerName || "Unknown",
    callerAvatar: callerAvatar || "",
    callerPhone: callerPhone || "",
    isVideo: callType === 'video',
    conversationId: conversationId || ""
  };

  // Send FCM v1 to each device token and collect per-token results
  const perTokenResults: Array<{ token: string; platform: string; success: boolean; messageId?: string; error?: string; httpStatus?: number }> = [];

  const results = await Promise.allSettled(
    deviceTokens.map(async (tokenData: any) => {
      const result = await sendFCMv1Call(
        projectId,
        accessToken,
        tokenData.device_token,
        callData
      );

      const maskedToken = tokenData.device_token.length > 16
        ? tokenData.device_token.substring(0, 8) + '...' + tokenData.device_token.substring(tokenData.device_token.length - 8)
        : tokenData.device_token;

      if (result.success) {
        perTokenResults.push({ token: maskedToken, platform: tokenData.platform, success: true, messageId: result.messageId });
        await supabase
          .from('device_tokens')
          .update({ last_used_at: new Date().toISOString() })
          .eq('device_token', tokenData.device_token);
        return result;
      } else {
        perTokenResults.push({ token: maskedToken, platform: tokenData.platform, success: false, error: result.error });
        // Check if token is invalid and remove it
        if (result.error?.includes('UNREGISTERED') || 
            result.error?.includes('INVALID_ARGUMENT')) {
          console.log('🗑️ Removing invalid token');
          await supabase
            .from('device_tokens')
            .delete()
            .eq('device_token', tokenData.device_token);
        }
        throw new Error(result.error);
      }
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  const latencyMs = Date.now() - startTime;

  console.log(`✅ Call notification (FCM v1) sent to ${successful} device(s), failed: ${failed}, latency: ${latencyMs}ms`);

  // Log delivery validation result
  const firstSuccess = perTokenResults.find(r => r.success);
  const firstError = perTokenResults.find(r => !r.success);
  await logDeliveryResult(supabase, {
    callId,
    receiverId,
    callerId,
    tokensFound: deviceTokens.length,
    tokensSent: successful,
    tokensFailed: failed,
    status: successful > 0 ? 'delivered' : 'all_failed',
    error: firstError?.error || null,
    fcmMessageId: firstSuccess?.messageId || null,
    deviceTokenMasked: firstSuccess?.token || firstError?.token || null,
    platform: perTokenResults[0]?.platform || null,
    apiVersion: 'v1',
    latencyMs,
  });

  const validation = {
    status: successful > 0 ? 'delivered' : 'all_failed',
    tokensFound: deviceTokens.length,
    tokensSent: successful,
    tokensFailed: failed,
    latencyMs,
    perTokenResults,
  };

  return new Response(
    JSON.stringify({ success: successful > 0, sentTo: successful, failed, api: 'v1', validation }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/** Persist FCM delivery validation to fcm_delivery_logs */
async function logDeliveryResult(supabase: any, data: {
  callId: string; receiverId: string; callerId: string;
  tokensFound: number; tokensSent: number; tokensFailed: number;
  status: string; error?: string | null; fcmMessageId?: string | null;
  deviceTokenMasked?: string | null; platform?: string | null;
  apiVersion: string; latencyMs: number;
}) {
  try {
    await supabase.from('fcm_delivery_logs').insert({
      call_id: data.callId,
      receiver_id: data.receiverId,
      caller_id: data.callerId,
      device_token_masked: data.deviceTokenMasked || null,
      platform: data.platform || null,
      fcm_message_id: data.fcmMessageId || null,
      fcm_status: data.status,
      fcm_error: data.error || null,
      api_version: data.apiVersion,
      tokens_found: data.tokensFound,
      tokens_sent: data.tokensSent,
      tokens_failed: data.tokensFailed,
      delivery_latency_ms: data.latencyMs,
    });
    console.log('📊 FCM delivery validation logged:', data.status);
  } catch (err) {
    console.error('⚠️ Failed to log FCM delivery:', err);
  }
}

/**
 * LEGACY FCM API (fallback only - NOT recommended for calls)
 * Use only if FIREBASE_SERVICE_ACCOUNT is not configured
 */
async function handleCallNotificationLegacy(
  supabase: any,
  payload: CallNotification
) {
  const { receiverId, callerId, callerName, callerAvatar, callId, callType, conversationId } = payload;
  const firebaseServerKey = Deno.env.get('FIREBASE_SERVER_KEY');

  if (!firebaseServerKey) {
    console.error('❌ Neither FIREBASE_SERVICE_ACCOUNT nor FIREBASE_SERVER_KEY configured');
    return new Response(
      JSON.stringify({ error: 'FCM not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('📞 Processing CALL notification (LEGACY) for receiver:', receiverId);

  const { data: deviceTokens, error: tokenError } = await supabase
    .from('device_tokens')
    .select('device_token, platform')
    .eq('user_id', receiverId);

  if (tokenError) throw tokenError;

  if (!deviceTokens || deviceTokens.length === 0) {
    console.log('⚠️ No FCM tokens found for receiver:', receiverId);
    return new Response(
      JSON.stringify({ success: false, message: 'No device tokens found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('📱 Found', deviceTokens.length, 'device(s) for call receiver');

  const results = await Promise.allSettled(
    deviceTokens.map(async (tokenData: any) => {
      const fcmPayload = {
        to: tokenData.device_token,
        priority: "high",
        android: { priority: "high" },
        data: {
          type: "call",
          call_id: callId,
          caller_id: callerId,
          caller_name: callerName || "Unknown",
          caller_avatar: callerAvatar || "",
          is_video: callType === 'video' ? "true" : "false",
          conversation_id: conversationId || "",
          timestamp: Date.now().toString()
        },
        time_to_live: 30
      };

      console.log('📤 Sending LEGACY CALL FCM to:', tokenData.device_token.substring(0, 30) + '...');
      console.log('📤 Payload:', JSON.stringify(fcmPayload, null, 2));

      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${firebaseServerKey}`,
        },
        body: JSON.stringify(fcmPayload),
      });

      const result = await response.json();
      console.log('📤 Legacy FCM Response:', JSON.stringify(result));
      
      if (!response.ok || result.failure > 0) {
        console.error('❌ FCM Call Error:', result);
        if (result.results?.[0]?.error === 'NotRegistered' || 
            result.results?.[0]?.error === 'InvalidRegistration') {
          console.log('🗑️ Removing invalid token');
          await supabase.from('device_tokens').delete().eq('device_token', tokenData.device_token);
        }
        throw new Error(result.results?.[0]?.error || 'FCM failed');
      }

      await supabase.from('device_tokens').update({ last_used_at: new Date().toISOString() }).eq('device_token', tokenData.device_token);
      return result;
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`✅ Call notification (LEGACY) sent to ${successful} device(s), failed: ${failed}`);

  return new Response(
    JSON.stringify({ success: true, sentTo: successful, failed, api: 'legacy' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
