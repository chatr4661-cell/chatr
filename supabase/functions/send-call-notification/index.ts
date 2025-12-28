import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * FCM HTTP v1 API - WhatsApp-style Incoming Call Notifications
 * 
 * CRITICAL REQUIREMENTS:
 * 1. DATA-ONLY payload (NO notification blocks)
 * 2. HIGH priority for Android
 * 3. TOKEN-based sending (no topics/conditions)
 * 4. OAuth2 Service Account authentication
 * 5. TTL ≤ 30 seconds
 */

// Generate JWT for Google OAuth2
async function createJWT(serviceAccount: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging'
  }

  const encoder = new TextEncoder()
  const headerB64 = base64UrlEncode(JSON.stringify(header))
  const payloadB64 = base64UrlEncode(JSON.stringify(payload))
  const unsignedToken = `${headerB64}.${payloadB64}`

  // Import private key and sign
  const privateKey = serviceAccount.private_key
  const pemContents = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken)
  )

  const signatureB64 = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)))
  return `${unsignedToken}.${signatureB64}`
}

function base64UrlEncode(str: string): string {
  const b64 = btoa(str)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Get OAuth2 access token from Google
async function getAccessToken(serviceAccount: any): Promise<string> {
  console.log('[FCM-v1] Generating OAuth2 access token...')
  
  const jwt = await createJWT(serviceAccount)
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[FCM-v1] OAuth2 token error:', error)
    throw new Error(`Failed to get access token: ${error}`)
  }

  const data = await response.json()
  console.log('[FCM-v1] OAuth2 token obtained successfully')
  return data.access_token
}

// Send FCM HTTP v1 message
async function sendFCMv1(
  projectId: string,
  accessToken: string,
  fcmToken: string,
  callData: {
    callId: string
    callerId: string
    callerName: string
    callerAvatar: string
    isVideo: boolean
    conversationId: string
  }
): Promise<any> {
  const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`
  
  // EXACT payload format - DATA-ONLY, NO notification blocks
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
        is_video: callData.isVideo ? "true" : "false",
        conversation_id: callData.conversationId || "",
        timestamp: Date.now().toString()
      }
    }
  }

  // DEBUG LOGGING (MANDATORY)
  const maskedToken = fcmToken.substring(0, 8) + '...' + fcmToken.substring(fcmToken.length - 8)
  console.log('[FCM-v1] ========== OUTGOING FCM REQUEST ==========')
  console.log('[FCM-v1] Endpoint:', endpoint)
  console.log('[FCM-v1] Target Token (masked):', maskedToken)
  console.log('[FCM-v1] Payload:', JSON.stringify(fcmPayload, null, 2))
  console.log('[FCM-v1] ==========================================')

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(fcmPayload)
  })

  const responseBody = await response.text()
  
  // DEBUG LOGGING (MANDATORY)
  console.log('[FCM-v1] ========== FCM RESPONSE ==========')
  console.log('[FCM-v1] HTTP Status:', response.status)
  console.log('[FCM-v1] Response Body:', responseBody)
  console.log('[FCM-v1] ===================================')

  if (!response.ok) {
    throw new Error(`FCM v1 request failed: ${response.status} - ${responseBody}`)
  }

  return JSON.parse(responseBody)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[FCM-v1] ========== INCOMING CALL NOTIFICATION ==========')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      console.error('[FCM-v1] Unauthorized request')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { callId, receiverId, callType, callerName, callerAvatar, conversationId } = body

    console.log(`[FCM-v1] Call ${callId} from ${user.id} to ${receiverId}`)
    console.log(`[FCM-v1] Call Type: ${callType}, Caller: ${callerName}`)

    // Get service role client
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get receiver's FCM token
    const { data: tokenData, error: tokenError } = await serviceClient
      .from('device_tokens')
      .select('device_token, platform')
      .eq('user_id', receiverId)
      .not('device_token', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (tokenError || !tokenData?.device_token) {
      console.log(`[FCM-v1] No FCM token found for receiver ${receiverId}`)
      return new Response(JSON.stringify({ 
        success: true, 
        fcmSent: false,
        reason: 'no_fcm_token'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[FCM-v1] Found FCM token for platform: ${tokenData.platform}`)

    // Get Firebase service account credentials
    const firebaseServiceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!firebaseServiceAccountJson) {
      console.error('[FCM-v1] FIREBASE_SERVICE_ACCOUNT not configured')
      
      // Fallback to legacy API if v1 not configured
      const firebaseServerKey = Deno.env.get('FIREBASE_SERVER_KEY')
      if (firebaseServerKey) {
        console.log('[FCM-v1] Falling back to legacy FCM API...')
        return await sendLegacyFCM(firebaseServerKey, tokenData.device_token, {
          callId,
          callerId: user.id,
          callerName,
          callerAvatar,
          isVideo: callType === 'video',
          conversationId
        }, serviceClient, corsHeaders)
      }
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'FCM not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse service account and get project ID
    const serviceAccount = JSON.parse(firebaseServiceAccountJson)
    const projectId = serviceAccount.project_id

    console.log(`[FCM-v1] Using Firebase Project: ${projectId}`)

    // Get OAuth2 access token
    const accessToken = await getAccessToken(serviceAccount)

    // Send FCM v1 message
    const fcmResult = await sendFCMv1(
      projectId,
      accessToken,
      tokenData.device_token,
      {
        callId,
        callerId: user.id,
        callerName,
        callerAvatar,
        isVideo: callType === 'video',
        conversationId
      }
    )

    console.log('[FCM-v1] Message sent successfully:', fcmResult.name)

    // Update last_used_at for the token
    await serviceClient
      .from('device_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('device_token', tokenData.device_token)

    return new Response(JSON.stringify({ 
      success: true, 
      fcmSent: true,
      messageId: fcmResult.name
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[FCM-v1] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Legacy FCM fallback (for backward compatibility)
async function sendLegacyFCM(
  serverKey: string,
  fcmToken: string,
  callData: {
    callId: string
    callerId: string
    callerName: string
    callerAvatar: string
    isVideo: boolean
    conversationId: string
  },
  serviceClient: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  console.log('[FCM-Legacy] Using legacy /fcm/send endpoint')
  
  const fcmPayload = {
    to: fcmToken,
    priority: "high",
    android: {
      priority: "high"
    },
    data: {
      type: "call",
      call_id: callData.callId,
      caller_id: callData.callerId,
      caller_name: callData.callerName || "Unknown",
      caller_avatar: callData.callerAvatar || "",
      is_video: callData.isVideo ? "true" : "false",
      conversation_id: callData.conversationId || "",
      timestamp: Date.now().toString()
    },
    time_to_live: 30
  }

  console.log('[FCM-Legacy] Payload:', JSON.stringify(fcmPayload, null, 2))

  const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${serverKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(fcmPayload)
  })

  const fcmResult = await fcmResponse.json()
  console.log('[FCM-Legacy] Result:', JSON.stringify(fcmResult))

  if (fcmResult.success === 1) {
    await serviceClient
      .from('device_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('device_token', fcmToken)
  }

  if (fcmResult.results?.[0]?.error === 'NotRegistered' || 
      fcmResult.results?.[0]?.error === 'InvalidRegistration') {
    console.log('[FCM-Legacy] Removing invalid token')
    await serviceClient
      .from('device_tokens')
      .delete()
      .eq('device_token', fcmToken)
  }

  return new Response(JSON.stringify({ 
    success: true, 
    fcmSent: fcmResult.success === 1,
    fcmResult,
    api: 'legacy'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
