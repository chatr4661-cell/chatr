import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Get OAuth2 access token from service account
async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + 3600 // 1 hour

  // Create JWT header and payload
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: exp,
  }

  // Base64URL encode
  const base64url = (data: any) => {
    const json = JSON.stringify(data)
    const base64 = btoa(json)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  const headerB64 = base64url(header)
  const payloadB64 = base64url(payload)
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
    new TextEncoder().encode(unsignedToken)
  )

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const jwt = `${unsignedToken}.${signatureB64}`

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  const tokenData = await tokenResponse.json()
  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`)
  }

  return tokenData.access_token
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { token, title, body, data } = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({ error: "FCM token is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT")
    if (!serviceAccountJson) {
      console.error('[send-push] FIREBASE_SERVICE_ACCOUNT not configured')
      return new Response(
        JSON.stringify({ error: "FIREBASE_SERVICE_ACCOUNT not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const serviceAccount = JSON.parse(serviceAccountJson)
    const projectId = serviceAccount.project_id

    console.log('[send-push] Sending to token:', token.substring(0, 20) + '...')
    console.log('[send-push] Type:', data?.type || 'general')

    // Get access token
    const accessToken = await getAccessToken(serviceAccount)

    // Build FCM v1 message
    const message: any = {
      message: {
        token,
        android: {
          priority: "high",
        },
      },
    }

    // Add notification if title/body provided
    if (title || body) {
      message.message.notification = {
        title: title || 'Chatr',
        body: body || '',
      }
    }

    // Add data payload (must be string values)
    if (data) {
      message.message.data = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      )
    }

    // Special handling for call notifications
    if (data?.type === 'call' || data?.type === 'incoming_call') {
      message.message.android = {
        priority: "high",
        ttl: "30s",
        direct_boot_ok: true,
      }
      console.log('[send-push] Call notification - high priority enabled')
    }

    console.log('[send-push] Payload:', JSON.stringify(message, null, 2))

    // Send via FCM v1 API
    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      }
    )

    const fcmResult = await fcmResponse.json()
    console.log('[send-push] FCM Response:', JSON.stringify(fcmResult))

    if (!fcmResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: fcmResult.error?.message || 'FCM send failed',
          details: fcmResult 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, messageId: fcmResult.name }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[send-push] Error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
