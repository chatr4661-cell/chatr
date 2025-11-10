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
  notificationType?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firebaseServerKey = Deno.env.get('FIREBASE_SERVER_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, title, body, data, notificationType } = await req.json() as PushNotificationRequest;

    console.log('📲 Sending push notification to user:', userId, 'Type:', notificationType);

    // Check user's notification preferences
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Check if this notification type is enabled
    if (preferences) {
      const typeMapping: Record<string, keyof typeof preferences> = {
        'chat': 'chat_notifications',
        'call': 'call_notifications',
        'group': 'group_notifications',
        'transaction': 'transaction_alerts',
        'update': 'app_updates',
        'marketing': 'marketing_alerts'
      };

      const prefKey = typeMapping[notificationType || 'chat'];
      if (prefKey && !preferences[prefKey]) {
        console.log('⚠️ User has disabled', notificationType, 'notifications');
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'User has disabled this notification type' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }
    }

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
    
    // Send FCM notifications
    const results = await Promise.allSettled(
      deviceTokens.map(async (tokenData) => {
        const fcmPayload = {
          to: tokenData.device_token,
          notification: {
            title,
            body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            tag: 'chatr-notification',
            requireInteraction: true,
            click_action: data?.click_action || 'FLUTTER_NOTIFICATION_CLICK',
            sound: preferences?.sound_enabled ? 'default' : undefined,
            vibrate: preferences?.vibration_enabled ? [200, 100, 200] : undefined,
          },
          data: {
            ...data,
            notificationType: notificationType || 'general',
            timestamp: new Date().toISOString(),
          },
          priority: 'high',
          content_available: true,
        };

        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${firebaseServerKey}`,
          },
          body: JSON.stringify(fcmPayload),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('FCM Error for token:', tokenData.device_token.substring(0, 20) + '...', error);
          throw new Error(`FCM request failed: ${error}`);
        }

        const result = await response.json();
        console.log('FCM Success:', result);
        
        // Update last_used_at for successful delivery
        await supabase
          .from('device_tokens')
          .update({ last_used_at: new Date().toISOString() })
          .eq('device_token', tokenData.device_token);

        return result;
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Sent ${successful} notifications, ❌ Failed: ${failed}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sentTo: successful,
        failed,
        message: `Push notifications sent to ${successful} device(s)`
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