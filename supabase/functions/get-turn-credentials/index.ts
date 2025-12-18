import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Reliable STUN/TURN server configuration for video calls
    const iceServers = [
      // Google STUN servers (highly reliable, globally distributed)
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      
      // Cloudflare STUN (fast, reliable)
      { urls: 'stun:stun.cloudflare.com:3478' },
      
      // Mozilla STUN
      { urls: 'stun:stun.services.mozilla.com:3478' },
      
      // Metered.ca TURN servers (free tier - reliable)
      { 
        urls: [
          'turn:a.relay.metered.ca:80',
          'turn:a.relay.metered.ca:80?transport=tcp',
          'turn:a.relay.metered.ca:443',
          'turn:a.relay.metered.ca:443?transport=tcp'
        ],
        username: 'e8dd65c92ae9a3b9bfcbeb6e',
        credential: 'uWdWNmkhvyqTW1QP'
      },
      
      // Xirsys free TURN (backup)
      {
        urls: [
          'turn:fr-turn1.xirsys.com:80?transport=udp',
          'turn:fr-turn1.xirsys.com:3478?transport=tcp',
          'turn:fr-turn1.xirsys.com:443?transport=tcp'
        ],
        username: '6820e6b6-bcd2-11ef-8ba9-0242ac120004',
        credential: '6820e852-bcd2-11ef-8ba9-0242ac120004'
      },
      
      // Additional TURN relay for strict NAT
      {
        urls: 'turn:relay.metered.ca:443?transport=tcp',
        username: 'e8dd65c92ae9a3b9bfcbeb6e',
        credential: 'uWdWNmkhvyqTW1QP'
      }
    ];

    console.log('Returning', iceServers.length, 'ICE server configurations');

    return new Response(
      JSON.stringify({ iceServers }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error getting TURN credentials:', error);
    
    // Return basic STUN servers as fallback
    const fallbackServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' }
    ];
    
    return new Response(
      JSON.stringify({ iceServers: fallbackServers }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
