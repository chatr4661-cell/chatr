import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SignalMessage {
  type: 'offer' | 'answer' | 'ice-candidate'
  callId: string
  data: any
  from: string
  to: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
      throw new Error('Unauthorized')
    }

    const { action, ...signalData } = await req.json() as SignalMessage & { action: string }

    if (action === 'send-signal') {
      // Store signal in database for the recipient to retrieve
      const { error } = await supabaseClient
        .from('webrtc_signals')
        .insert({
          call_id: signalData.callId,
          signal_type: signalData.type,
          signal_data: signalData.data,
          from_user: user.id,
          to_user: signalData.to
        })

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'get-signals') {
      const { data, error } = await supabaseClient
        .from('webrtc_signals')
        .select('*')
        .eq('call_id', signalData.callId)
        .eq('to_user', user.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Delete retrieved signals
      await supabaseClient
        .from('webrtc_signals')
        .delete()
        .eq('call_id', signalData.callId)
        .eq('to_user', user.id)

      return new Response(
        JSON.stringify({ signals: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
