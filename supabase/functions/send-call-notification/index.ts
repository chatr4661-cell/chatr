import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { callId, receiverId, callType, callerName, callerAvatar, conversationId } = body

    console.log(`[Send-Call-Notification] Call ${callId} from ${user.id} to ${receiverId}`)

    // Get service role client for FCM
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get receiver's FCM token
    const { data: tokenData } = await serviceClient
      .from('device_tokens')
      .select('device_token, platform')
      .eq('user_id', receiverId)
      .not('device_token', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (!tokenData?.device_token) {
      console.log(`[Send-Call-Notification] No FCM token for receiver ${receiverId}`)
      return new Response(JSON.stringify({ 
        success: true, 
        fcmSent: false,
        reason: 'no_fcm_token'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const firebaseServerKey = Deno.env.get('FIREBASE_SERVER_KEY')
    if (!firebaseServerKey) {
      console.error('[Send-Call-Notification] FIREBASE_SERVER_KEY not set')
      return new Response(JSON.stringify({ 
        success: true, 
        fcmSent: false,
        reason: 'fcm_not_configured'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    /**
     * CRITICAL: DATA-ONLY FCM MESSAGE FOR INCOMING CALLS
     * 
     * WhatsApp-style incoming calls require DATA-ONLY messages:
     * - NO "notification" block (would prevent app wake when killed)
     * - NO "android.notification" block
     * - NO "apns.alert" or iOS notification fields for Android
     * - Android priority MUST be "high"
     * - Token-based sending ONLY (no topics/conditions)
     */
    const fcmPayload = {
      to: tokenData.device_token,
      // HIGH priority is MANDATORY for data-only messages to wake the app
      priority: "high",
      // Android-specific high priority
      android: {
        priority: "high"
      },
      // DATA-ONLY payload - NO notification block
      data: {
        type: "call",
        call_id: callId,
        caller_id: user.id,
        caller_name: callerName || "Unknown",
        caller_avatar: callerAvatar || "",
        is_video: callType === 'video' ? "true" : "false",
        conversation_id: conversationId || "",
        timestamp: Date.now().toString()
      },
      // Short TTL - call should be answered quickly
      time_to_live: 30
    }

    console.log('[Send-Call-Notification] Sending DATA-ONLY FCM payload:')
    console.log(JSON.stringify(fcmPayload, null, 2))

    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${firebaseServerKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fcmPayload)
    })

    const fcmResult = await fcmResponse.json()
    console.log('[Send-Call-Notification] FCM Result:', JSON.stringify(fcmResult))

    // Update last_used_at for the token
    if (fcmResult.success === 1) {
      await serviceClient
        .from('device_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('device_token', tokenData.device_token)
    }

    // Handle invalid tokens
    if (fcmResult.results?.[0]?.error === 'NotRegistered' || 
        fcmResult.results?.[0]?.error === 'InvalidRegistration') {
      console.log('[Send-Call-Notification] Removing invalid FCM token')
      await serviceClient
        .from('device_tokens')
        .delete()
        .eq('device_token', tokenData.device_token)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      fcmSent: fcmResult.success === 1,
      fcmResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[Send-Call-Notification] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
