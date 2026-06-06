import { supabase } from '@/integrations/supabase/client';

export interface SignalData {
  type: 'offer' | 'answer' | 'ice-candidate';
  callId: string;
  data: any;
  to: string;
}

const offerSdpBytes = (data: any): number => String(data?.sdp ?? data?.description ?? '').length;

let cachedIceServers: RTCIceServer[] | null = null;
let prefetchPromise: Promise<RTCIceServer[]> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 300000; // 5 minutes

const BLACKLISTED_ICE_HOSTS = [
  'stun.mozilla.org',
  'stun.services.mozilla.com',
  'fr-turn1.xirsys.com',
  'xirsys.com',
];

// Emergency relay fallback used only when dynamic TURN credentials cannot be fetched.
// Dynamic Cloudflare TURN credentials remain the preferred path.
const OPEN_RELAY_TURN_FALLBACK: RTCIceServer = {
  urls: [
    'turn:openrelay.metered.ca:80',
    'turn:openrelay.metered.ca:80?transport=tcp',
    'turn:openrelay.metered.ca:443',
    'turns:openrelay.metered.ca:443?transport=tcp',
  ],
  username: 'openrelayproject',
  credential: 'openrelayproject',
};

// Used when the primary TURN API and edge function are unavailable or time out.
const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  OPEN_RELAY_TURN_FALLBACK,
];

// Keep FALLBACK_STUN_SERVERS alias for backward compat
export const FALLBACK_STUN_SERVERS = FALLBACK_ICE_SERVERS;

function normalizeIceServers(input: any): any[] {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.iceServers)) return input.iceServers;
  if (input?.iceServers?.urls) return [input.iceServers];
  if (input?.urls) return [input];
  return [];
}

function sanitizeIceServers(servers: any[] | { iceServers?: any[] | any } | null | undefined): RTCIceServer[] {
  const dropped: string[] = [];
  const normalizedServers = normalizeIceServers(servers);
  const cleaned = normalizedServers.map(server => {
    if (!server?.urls) return null;

    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    const filteredUrls = urls.filter((url: string) => {
      const lower = String(url).toLowerCase();
      const blocked = BLACKLISTED_ICE_HOSTS.some(host => lower.includes(host));
      if (blocked) dropped.push(url);
      return !blocked;
    });

    if (filteredUrls.length === 0) return null;
    return {
      ...server,
      urls: filteredUrls.length === 1 ? filteredUrls[0] : filteredUrls,
    };
  }).filter(Boolean) as RTCIceServer[];

  if (dropped.length > 0) {
    console.warn('[WebRTC] Removed stale/unreachable ICE servers:', dropped);
  }

  if (cleaned.length === 0) {
    return FALLBACK_ICE_SERVERS;
  }

  const hasStun = cleaned.some(server => {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls as string];
    return urls.some((url: string) => String(url).startsWith('stun:'));
  });

  const hasTurn = cleaned.some(server => {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls as string];
    return urls.some((url: string) => String(url).startsWith('turn:') || String(url).startsWith('turns:'));
  });

  // Always ensure STUN and TURN are present
  const withStun = hasStun ? cleaned : [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    ...cleaned,
  ];

  return hasTurn ? withStun : [...withStun, OPEN_RELAY_TURN_FALLBACK];
}

// Pre-fetch TURN credentials in the background to avoid blocking call setup
export const prefetchTurnConfig = (timeoutMs = 5000): Promise<RTCIceServer[]> => {
  const isCacheValid = cachedIceServers && (Date.now() - cacheTimestamp < CACHE_TTL_MS);

  if (isCacheValid) {
    return Promise.resolve(cachedIceServers!);
  }

  if (cachedIceServers && !isCacheValid) {
    console.log('[WebRTC] ICE cache expired, forcing a fresh pre-fetch...');
    cachedIceServers = null;
    prefetchPromise = null;
  }

  if (prefetchPromise) {
    return prefetchPromise;
  }

  console.log('[WebRTC] Pre-fetching TURN credentials from chatr.chat/api/turn-credentials...');
  prefetchPromise = (async (): Promise<RTCIceServer[]> => {
      // PRIMARY: Fetch real Cloudflare TURN credentials directly from Cloudflare
      const cfTurnKeyId = "f14d776ea3375f146d24d7107ad4a2f6";
      const cfApiToken = "a448972031b1c8299b0092addd9065c0665990b9203094daa4467a8f5bbadb96";
      
      try {
        const response = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${cfTurnKeyId}/credentials/generate-ice-servers`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cfApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ttl: 86400 }),
        });

        if (response.ok) {
          const data = await response.json();
          // Cloudflare returns an array or an object depending on the endpoint structure, sanitize IceServers handles it
          const servers = sanitizeIceServers(data.iceServers ?? data);
          if (servers.length > 0) {
            console.log(`[ICE Diagnostics] ✅ Direct Cloudflare TURN fetch successful: ${servers.length} server(s)`);
            cachedIceServers = servers;
            cacheTimestamp = Date.now();
            return cachedIceServers;
          }
        } else {
          console.warn(`[ICE Diagnostics] Direct Cloudflare TURN returned unexpected response (${response.status})`);
        }
      } catch (primaryError) {
        console.warn('[ICE Diagnostics] Direct Cloudflare TURN fetch failed:', primaryError);
      }

    // SECONDARY: Try Supabase edge function
    try {
      const responsePromise = supabase.functions.invoke('webrtc-signaling', { method: 'POST', body: { action: 'get_ice_servers' } });
      const { data, error } = await Promise.race([
        responsePromise,
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Edge Timeout')), 4000))
      ]);

      if (!error && data?.iceServers) {
        const servers = Array.isArray(data.iceServers) ? data.iceServers : [data.iceServers];
        console.log(`[ICE Diagnostics] Supabase TURN fetch successful: ${servers.length} servers`);
        cachedIceServers = sanitizeIceServers(servers);
        cacheTimestamp = Date.now();
        return cachedIceServers!;
      }
    } catch (secondaryError) {
      console.warn('[ICE Diagnostics] Supabase TURN edge function also failed:', secondaryError);
    }

    console.warn('[ICE Diagnostics] All TURN sources failed — using emergency relay fallback');
    prefetchPromise = null;
    return FALLBACK_ICE_SERVERS;
  })();

  return prefetchPromise;
};


// Direct getter — resolves from cache if pre-fetched, otherwise waits up to 5s
export const getTurnConfig = async (): Promise<RTCIceServer[]> => {
  const isCacheValid = cachedIceServers && (Date.now() - cacheTimestamp < CACHE_TTL_MS);

  if (isCacheValid) {
    console.log('[ICE Diagnostics] Using cached ICE servers');
    return cachedIceServers!;
  }

  if (prefetchPromise && !cachedIceServers) {
    console.log('[ICE Diagnostics] ICE pre-fetch in-flight; racing with 5s fallback timeout');
    return Promise.race([
      prefetchPromise,
      new Promise<RTCIceServer[]>(resolve => {
        window.setTimeout(() => {
          console.warn('[ICE Diagnostics] ⏳ TURN fetch timed out (5000ms), using emergency relay fallback');
          resolve(FALLBACK_ICE_SERVERS);
        }, 5000);
      }),
    ]);
  }

  console.log('[ICE Diagnostics] Initiating direct LiveKit TURN fetch (5000ms timeout)');
  return prefetchTurnConfig(5000);
};

export const getOptimalTURNServers = getTurnConfig;

// Direct signaling through Supabase Realtime (no edge function)
export const sendSignalDirect = async (signalData: SignalData) => {
  const user = await supabase.auth.getUser();
  const sender = user.data.user?.id || '';
  const { error } = await supabase
    .from('webrtc_signals')
    .insert([{
      call_id: signalData.callId,
      from_user: sender,
      to_user: signalData.to,
      signal_type: signalData.type,
      signal_data: signalData.data as any
    }]);

  if (error) {
    if (signalData.type === 'offer') {
      console.error(
        `OFFER_INSERT_FAILED callId=${signalData.callId} sender=${sender} recipient=${signalData.to} ` +
        `transport=supabase-direct error=${error.message} sdpBytes=${offerSdpBytes(signalData.data)} ` +
        `timestamp=${Date.now()}`
      );
    }
    throw error;
  }

  if (signalData.type === 'offer') {
    console.log(
      `OFFER_INSERTED callId=${signalData.callId} sender=${sender} recipient=${signalData.to} ` +
      `transport=supabase-direct sdpBytes=${offerSdpBytes(signalData.data)} timestamp=${Date.now()}`
    );
  }
};

export const sendSignal = sendSignalDirect;

// Fetch ALL existing signals for a call (crucial for late joiners)
export const getSignals = async (callId: string, toUserId: string) => {
  console.log('Fetching past signals:', {
    callId,
    toUserId,
    timestamp: new Date().toISOString()
  });

  const { data, error } = await supabase
    .from('webrtc_signals')
    .select('*')
    .eq('call_id', callId)
    .eq('to_user', toUserId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[getSignals] Error fetching signals:', {
      error,
      callId,
      toUserId
    });
    throw error;
  }

  const offerRows = (data || []).filter(s => s.signal_type === 'offer');
  console.log(
    `OFFER_RETRIEVED callId=${callId} source=webrtc-signaling-getSignals ` +
    `found=${offerRows.length > 0} count=${offerRows.length} ` +
    `totalSignals=${data?.length || 0} timestamp=${Date.now()}`
  );

  console.log(`[getSignals] Found ${data?.length || 0} past signals:`,
    data?.map(s => ({
      type: s.signal_type,
      from: s.from_user,
      to: s.to_user,
      created: s.created_at
    }))
  );

  return data || [];
};

// Delete processed signals to keep table clean
export const deleteProcessedSignals = async (callId: string, toUserId: string) => {
  await supabase
    .from('webrtc_signals')
    .delete()
    .eq('call_id', callId)
    .eq('to_user', toUserId);
};

export const subscribeToCallSignals = async (
  callId: string,
  currentUserId: string,
  onSignal: (signal: any) => void
) => {
  console.log('Subscribing to signals for call:', callId, 'user:', currentUserId);

  const channel = supabase
    .channel(`call-${callId}-${currentUserId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'webrtc_signals',
        filter: `call_id=eq.${callId}`
      },
      (payload) => {
        if (payload.new.to_user !== currentUserId) {
          console.log('Ignoring signal not meant for this user:', {
            type: payload.new.signal_type,
            from: payload.new.from_user,
            to: payload.new.to_user,
            currentUser: currentUserId
          });
          return;
        }

        console.log('Realtime signal received:', {
          type: payload.new.signal_type,
          from: payload.new.from_user,
          to: payload.new.to_user
        });
        if (payload.new.signal_type === 'offer') {
          console.log(
            `OFFER_RETRIEVED callId=${callId} source=webrtc-signaling-realtime ` +
            `signalId=${payload.new.id} sender=${payload.new.from_user} recipient=${payload.new.to_user} ` +
            `sdpBytes=${offerSdpBytes(payload.new.signal_data)} timestamp=${Date.now()}`
          );
        }
        onSignal(payload.new);
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status);
    });

  return () => {
    console.log('Unsubscribing from call signals');
    supabase.removeChannel(channel);
  };
};
