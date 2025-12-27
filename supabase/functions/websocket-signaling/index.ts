import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Store active WebSocket connections by user ID
const connections = new Map<string, WebSocket>()

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { headers } = req
  const upgradeHeader = headers.get("upgrade") || ""

  // Check if this is a WebSocket upgrade request
  if (upgradeHeader.toLowerCase() !== "websocket") {
    // Handle regular HTTP requests for sending events
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
      const { action, targetUserId, eventType, eventData } = body

      console.log(`[WS-Signaling] Action: ${action}, Target: ${targetUserId}, Event: ${eventType}`)

      if (action === 'send-event') {
        // Send event to target user if they're connected
        const targetSocket = connections.get(targetUserId)
        if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
          targetSocket.send(JSON.stringify({
            type: eventType,
            ...eventData
          }))
          console.log(`[WS-Signaling] Event sent to ${targetUserId}`)
          return new Response(JSON.stringify({ success: true, delivered: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } else {
          console.log(`[WS-Signaling] User ${targetUserId} not connected`)
          return new Response(JSON.stringify({ success: true, delivered: false, reason: 'user_offline' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('[WS-Signaling] Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  // Handle WebSocket upgrade
  try {
    const { socket, response } = Deno.upgradeWebSocket(req)
    let userId: string | null = null

    socket.onopen = () => {
      console.log('[WS-Signaling] WebSocket opened')
    }

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('[WS-Signaling] Received:', data.type)

        // Handle authentication
        if (data.type === 'auth') {
          const token = data.token
          const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
              global: {
                headers: { Authorization: `Bearer ${token}` },
              },
            }
          )

          const { data: { user } } = await supabaseClient.auth.getUser()
          if (user) {
            userId = user.id
            connections.set(userId, socket)
            socket.send(JSON.stringify({ type: 'auth_success', userId }))
            console.log(`[WS-Signaling] User ${userId} authenticated`)
          } else {
            socket.send(JSON.stringify({ type: 'auth_error', error: 'Invalid token' }))
          }
          return
        }

        // Require authentication for other messages
        if (!userId) {
          socket.send(JSON.stringify({ type: 'error', error: 'Not authenticated' }))
          return
        }

        // Handle call signaling
        if (data.type === 'call_offer' || data.type === 'call_answer' || 
            data.type === 'ice_candidate' || data.type === 'call_end') {
          const targetSocket = connections.get(data.targetUserId)
          if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(JSON.stringify({
              ...data,
              fromUserId: userId
            }))
            console.log(`[WS-Signaling] Forwarded ${data.type} to ${data.targetUserId}`)
          }
        }

        // Handle incoming call notification
        if (data.type === 'incoming_call') {
          const targetSocket = connections.get(data.receiverId)
          if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(JSON.stringify({
              type: 'incoming_call',
              callId: data.callId,
              callerId: userId,
              callerName: data.callerName,
              callerAvatar: data.callerAvatar,
              callType: data.callType,
              conversationId: data.conversationId
            }))
            console.log(`[WS-Signaling] Sent incoming_call to ${data.receiverId}`)
          }
        }

      } catch (error) {
        console.error('[WS-Signaling] Message error:', error)
      }
    }

    socket.onclose = () => {
      if (userId) {
        connections.delete(userId)
        console.log(`[WS-Signaling] User ${userId} disconnected`)
      }
    }

    socket.onerror = (error) => {
      console.error('[WS-Signaling] Socket error:', error)
    }

    return response
  } catch (error) {
    console.error('[WS-Signaling] Upgrade error:', error)
    return new Response(JSON.stringify({ error: 'WebSocket upgrade failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
