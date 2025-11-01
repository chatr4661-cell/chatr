import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, title, body, data } = await req.json() as PushNotificationRequest;

    console.log('📲 Sending push notification to user:', userId);

    // Get all device tokens for this user
    const { data: deviceTokens, error: tokenError } = await supabase
      .from('device_tokens')
      .select('device_token, platform')
      .eq('user_id', userId);

    if (tokenError) {
      console.error('Error fetching device tokens:', tokenError);
      throw tokenError;
    }

    if (!deviceTokens || deviceTokens.length === 0) {
      console.log('⚠️ No device tokens found for user:', userId);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No device tokens found' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log('📱 Sending push to', deviceTokens.length, 'device(s)');
    
    // Send push notifications with quick reply action
    const notifications = deviceTokens.map(token => ({
      token: token.device_token,
      notification: {
        title,
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'chatr-message',
        requireInteraction: true,
        actions: [
          { action: 'reply', title: 'Reply' },
          { action: 'mark-read', title: 'Mark as Read' }
        ]
      },
      data: {
        ...data,
        click_action: 'quick_reply'
      }
    }));

    console.log('Notification payload:', notifications);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sentTo: deviceTokens.length,
        message: 'Push notifications queued'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});