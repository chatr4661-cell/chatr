import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, token, deviceInfo } = await req.json();
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';

    // Generate new QR token
    if (action === 'generate') {
      // Cleanup expired sessions first
      await supabase.rpc('cleanup_expired_qr_sessions');

      // Generate unique token
      const newToken = crypto.randomUUID() + '-' + Date.now().toString(36);
      
      const { data, error } = await supabase
        .from('qr_login_sessions')
        .insert({
          token: newToken,
          ip_address: clientIp,
          device_info: deviceInfo || {},
          status: 'pending',
          expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString() // 2 minutes
        })
        .select()
        .single();

      if (error) {
        console.error('Error generating QR token:', error);
        throw error;
      }

      return new Response(JSON.stringify({ 
        success: true, 
        token: newToken,
        expiresAt: data.expires_at,
        sessionId: data.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check QR session status (for polling/realtime fallback)
    if (action === 'check') {
      const { data, error } = await supabase
        .from('qr_login_sessions')
        .select('*')
        .eq('token', token)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Session not found or expired' 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        await supabase
          .from('qr_login_sessions')
          .update({ status: 'expired' })
          .eq('id', data.id);

        return new Response(JSON.stringify({ 
          success: false, 
          status: 'expired' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // If authenticated, return session data
      if (data.status === 'authenticated' && data.user_id) {
        // Generate a custom session token for the web client
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(data.user_id);
        
        if (userError || !userData.user) {
          throw new Error('Failed to get user data');
        }

        // Create a magic link or session
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: userData.user.email!,
        });

        if (linkError) {
          console.error('Error generating magic link:', linkError);
          // Fallback: return user info for manual handling
          return new Response(JSON.stringify({ 
            success: true, 
            status: 'authenticated',
            userId: data.user_id,
            email: userData.user.email
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          status: 'authenticated',
          userId: data.user_id,
          magicLink: linkData.properties?.action_link
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        status: data.status,
        expiresAt: data.expires_at
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Authenticate QR session (called from mobile app after scanning)
    if (action === 'authenticate') {
      // Get user from auth header
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Authentication required' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const supabaseClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      
      if (userError || !user) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid authentication' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Find and validate the session
      const { data: session, error: sessionError } = await supabase
        .from('qr_login_sessions')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (sessionError || !session) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid or expired QR code' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check expiry
      if (new Date(session.expires_at) < new Date()) {
        await supabase
          .from('qr_login_sessions')
          .update({ status: 'expired' })
          .eq('id', session.id);

        return new Response(JSON.stringify({ 
          success: false, 
          error: 'QR code has expired' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Update session with user authentication
      const { error: updateError } = await supabase
        .from('qr_login_sessions')
        .update({ 
          user_id: user.id,
          status: 'authenticated',
          authenticated_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (updateError) {
        console.error('Error updating session:', updateError);
        throw updateError;
      }

      // Create linked device record
      await supabase
        .from('linked_devices')
        .insert({
          user_id: user.id,
          device_name: deviceInfo?.deviceName || 'Web Browser',
          device_type: 'web',
          browser: deviceInfo?.browser || 'Unknown',
          os: deviceInfo?.os || 'Unknown',
          ip_address: session.ip_address,
          session_token: token
        });

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Web session authenticated successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Logout/revoke linked device
    if (action === 'revoke') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ success: false, error: 'Auth required' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const supabaseClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid auth' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { deviceId } = await req.json();
      
      await supabase
        .from('linked_devices')
        .update({ is_active: false })
        .eq('id', deviceId)
        .eq('user_id', user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('QR Login error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});