import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

// Single event shape written to platform_events
interface IncomingEvent {
  stream_id: string
  version: number
  type: string
  payload?: unknown
  execution_context?: unknown
}

function isValidEvent(e: unknown): e is IncomingEvent {
  if (typeof e !== 'object' || e === null) return false
  const ev = e as Record<string, unknown>
  return (
    typeof ev.stream_id === 'string' &&
    ev.stream_id.length > 0 &&
    typeof ev.version === 'number' &&
    Number.isFinite(ev.version) &&
    typeof ev.type === 'string' &&
    ev.type.length > 0
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Authenticate the caller — only signed-in users may persist events.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Accept either a single event or an array of events.
    const rawEvents: unknown[] = Array.isArray(body)
      ? body
      : Array.isArray((body as Record<string, unknown>).events)
        ? ((body as Record<string, unknown>).events as unknown[])
        : [body]

    if (rawEvents.length === 0) {
      return new Response(JSON.stringify({ error: 'No events provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (rawEvents.length > 500) {
      return new Response(JSON.stringify({ error: 'Too many events (max 500 per request)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const invalidIndex = rawEvents.findIndex((e) => !isValidEvent(e))
    if (invalidIndex !== -1) {
      return new Response(
        JSON.stringify({ error: `Invalid event at index ${invalidIndex}. Requires stream_id (string), version (number), type (string).` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const rows = (rawEvents as IncomingEvent[]).map((e) => ({
      stream_id: e.stream_id,
      version: e.version,
      type: e.type,
      payload: e.payload ?? {},
      execution_context: e.execution_context ?? {},
    }))

    // Service-role client bypasses RLS to write to the backend-only table.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data, error } = await admin
      .from('platform_events')
      .insert(rows)
      .select('id, stream_id, version, type')

    if (error) {
      console.error('persist-events insert error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, inserted: data?.length ?? 0, events: data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('persist-events unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
