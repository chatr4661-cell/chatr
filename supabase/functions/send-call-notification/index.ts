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
      .select('fcm_token')
      .eq('user_id', receiverId)
      .not('fcm_token', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (!tokenData?.fcm_token) {
      console.log(`[Send-Call-Notification] No FCM token for receiver ${receiverId}`)
      return new Response(JSON.stringify({ 
        success: true, 
        fcmSent: false,
        reason: 'no_fcm_token'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')
    if (!fcmServerKey) {
      console.error('[Send-Call-Notification] FCM_SERVER_KEY not set')
      return new Response(JSON.stringify({ 
        success: true, 
        fcmSent: false,
        reason: 'fcm_not_configured'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Send high-priority FCM for incoming call
    const fcmPayload = {
      to: tokenData.fcm_token,
      priority: 'high',
      data: {
        type: 'incoming_call',
        callId,
        callerId: user.id,
        callerName: callerName || 'Unknown',
        callerAvatar: callerAvatar || '',
        callType: callType || 'audio',
        conversationId,
        click_action: 'OPEN_CALL_ACTIVITY',
        timestamp: Date.now().toString()
      },
      android: {
        priority: 'high',
        ttl: '30s',
        direct_boot_ok: true
      },
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'voip'
        },
        payload: {
          aps: {
            'content-available': 1,
            sound: 'ringtone.caf',
            'mutable-content': 1
          }
        }
      }
    }

    console.log('[Send-Call-Notification] Sending FCM:', JSON.stringify(fcmPayload))

    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${fcmServerKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fcmPayload)
    })

    const fcmResult = await fcmResponse.json()
    console.log('[Send-Call-Notification] FCM Result:', fcmResult)

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
