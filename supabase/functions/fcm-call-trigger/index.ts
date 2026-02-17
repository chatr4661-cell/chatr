import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * FCM Call Trigger - Bulletproof Database-Driven FCM Dispatch
 * 
 * This function is called via a database webhook (pg_net) whenever
 * a new call record is inserted with status='ringing'.
 * 
 * This ensures FCM is ALWAYS sent regardless of frontend behavior,
 * WebView issues, or client-side errors.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---- JWT / OAuth2 helpers (same as fcm-notify) ----

function base64UrlEncode(str: string): string {
  const b64 = btoa(str);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function createJWT(sa: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({
    iss: sa.client_email, sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  }));
  const unsigned = `${header}.${payload}`;
  const pem = sa.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const key = await crypto.subtle.importKey(
    'pkcs8',
    Uint8Array.from(atob(pem), c => c.charCodeAt(0)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64UrlEncode(String.fromCharCode(...new Uint8Array(sig)))}`;
}

async function getAccessToken(sa: any): Promise<string> {
  const jwt = await createJWT(sa);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`OAuth2 error: ${await res.text()}`);
  return (await res.json()).access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    
    // Support both direct call and webhook payload formats
    let callRecord: any;
    
    if (body.type === 'INSERT' && body.record) {
      // Database webhook format
      callRecord = body.record;
    } else if (body.callId) {
      // Direct invocation format
      callRecord = body;
    } else {
      console.log('[FCM-TRIGGER] Ignoring non-insert or unknown payload');
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callId = callRecord.id || callRecord.callId;
    const receiverId = callRecord.receiver_id || callRecord.receiverId;
    const callerId = callRecord.caller_id || callRecord.callerId;
    const callerName = callRecord.caller_name || callRecord.callerName || 'Unknown';
    const callerAvatar = callRecord.caller_avatar || callRecord.callerAvatar || '';
    const callerPhone = callRecord.caller_phone || callRecord.callerPhone || '';
    const callType = callRecord.call_type || callRecord.callType || 'audio';
    const conversationId = callRecord.conversation_id || callRecord.conversationId || '';
    const status = callRecord.status || 'ringing';

    // Only process ringing calls
    if (status !== 'ringing') {
      console.log(`[FCM-TRIGGER] Skipping call ${callId} with status: ${status}`);
      return new Response(JSON.stringify({ skipped: true, reason: 'not_ringing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[FCM-TRIGGER] ===== BULLETPROOF FCM DISPATCH =====`);
    console.log(`[FCM-TRIGGER] Call: ${callId} | Receiver: ${receiverId} | Type: ${callType}`);

    // Check if we already sent FCM for this call (deduplication)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existingLog } = await supabase
      .from('fcm_delivery_logs')
      .select('id')
      .eq('call_id', callId)
      .eq('fcm_status', 'delivered')
      .limit(1);

    if (existingLog && existingLog.length > 0) {
      console.log(`[FCM-TRIGGER] FCM already delivered for call ${callId}, skipping duplicate`);
      return new Response(JSON.stringify({ skipped: true, reason: 'already_delivered' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Firebase service account
    const saJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!saJson) {
      console.error('[FCM-TRIGGER] FIREBASE_SERVICE_ACCOUNT not configured');
      return new Response(JSON.stringify({ error: 'no_service_account' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sa = JSON.parse(saJson);
    const projectId = sa.project_id;
    const accessToken = await getAccessToken(sa);

    // Get receiver's device tokens
    const { data: tokens, error: tokenErr } = await supabase
      .from('device_tokens')
      .select('device_token, platform')
      .eq('user_id', receiverId);

    if (tokenErr || !tokens || tokens.length === 0) {
      console.warn(`[FCM-TRIGGER] No tokens for receiver ${receiverId}`);
      await logResult(supabase, {
        callId, receiverId, callerId, tokensFound: 0, tokensSent: 0, tokensFailed: 0,
        status: 'no_tokens', apiVersion: 'v1_trigger', latencyMs: Date.now() - startTime,
      });
      return new Response(JSON.stringify({ success: false, reason: 'no_tokens' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[FCM-TRIGGER] Found ${tokens.length} device token(s) for receiver`);

    // Send data-only FCM v1 to each token
    const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    let sent = 0, failed = 0;
    const errors: string[] = [];

    await Promise.allSettled(tokens.map(async (t: any) => {
      const payload = {
        message: {
          token: t.device_token,
          android: { priority: "HIGH", ttl: "30s" },
          data: {
            type: "call",
            call_id: callId,
            caller_id: callerId,
            caller_name: callerName,
            caller_avatar: callerAvatar,
            caller_phone: callerPhone,
            is_video: callType === 'video' ? "true" : "false",
            conversation_id: conversationId,
            timestamp: Date.now().toString(),
          },
        },
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resBody = await res.text();

      if (res.ok) {
        sent++;
        console.log(`[FCM-TRIGGER] ✅ Sent to ${t.platform}: ${t.device_token.substring(0, 12)}...`);
        await supabase.from('device_tokens').update({ last_used_at: new Date().toISOString() }).eq('device_token', t.device_token);
      } else {
        failed++;
        errors.push(resBody);
        console.error(`[FCM-TRIGGER] ❌ Failed for ${t.device_token.substring(0, 12)}...: ${resBody}`);
        // Remove invalid tokens
        if (resBody.includes('UNREGISTERED') || resBody.includes('INVALID_ARGUMENT')) {
          await supabase.from('device_tokens').delete().eq('device_token', t.device_token);
          console.log(`[FCM-TRIGGER] 🗑️ Removed invalid token`);
        }
      }
    }));

    const latencyMs = Date.now() - startTime;
    const finalStatus = sent > 0 ? 'delivered' : 'all_failed';

    console.log(`[FCM-TRIGGER] ===== RESULT: ${finalStatus} | Sent: ${sent}/${tokens.length} | ${latencyMs}ms =====`);

    await logResult(supabase, {
      callId, receiverId, callerId,
      tokensFound: tokens.length, tokensSent: sent, tokensFailed: failed,
      status: finalStatus, error: errors[0] || null,
      apiVersion: 'v1_trigger', latencyMs,
    });

    return new Response(JSON.stringify({
      success: sent > 0, sent, failed, total: tokens.length, latencyMs, source: 'db_trigger',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[FCM-TRIGGER] Fatal error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function logResult(supabase: any, data: any) {
  try {
    await supabase.from('fcm_delivery_logs').insert({
      call_id: data.callId,
      receiver_id: data.receiverId,
      caller_id: data.callerId,
      tokens_found: data.tokensFound,
      tokens_sent: data.tokensSent,
      tokens_failed: data.tokensFailed,
      fcm_status: data.status,
      fcm_error: data.error || null,
      api_version: data.apiVersion,
      delivery_latency_ms: data.latencyMs,
    });
  } catch (e) {
    console.error('[FCM-TRIGGER] Log write failed:', e);
  }
}
