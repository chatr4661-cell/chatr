import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Channel mapping for Android notification channels
const getChannelId = (type: string): string => {
  if (type.includes('call')) return 'chatr_calls';
  if (type.includes('message') || type.includes('chat')) return 'chatr_messages';
  if (type.includes('payment') || type.includes('wallet')) return 'chatr_payments';
  if (type.includes('health') || type.includes('medication')) return 'chatr_health';
  if (type.includes('food') || type.includes('order')) return 'chatr_orders';
  if (type.includes('appointment') || type.includes('booking')) return 'chatr_bookings';
  return 'chatr_general';
};

// Priority mapping
const getPriority = (type: string): string => {
  if (type.includes('call') || type.includes('alert') || type.includes('urgent')) return 'high';
  if (type.includes('reminder') || type.includes('payment')) return 'high';
  return 'normal';
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firebaseServerKey = Deno.env.get("FIREBASE_SERVER_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, type, title, body, data } = await req.json() as NotificationRequest;

    if (!userId || !type || !title || !body) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-module-notification] Sending ${type} notification to user ${userId}`);

    // 1. Store notification in database
    const { error: dbError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message: body,
        type,
        data: data || {},
        read: false,
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('[send-module-notification] DB insert error:', dbError);
    }

    // 2. Check user notification preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Default to enabled if no preferences found
    const pushEnabled = prefs?.push_enabled !== false;

    if (!pushEnabled) {
      console.log(`[send-module-notification] Push disabled for user ${userId}`);
      return new Response(
        JSON.stringify({ success: true, pushed: false, reason: 'push_disabled' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Get device tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('device_tokens')
      .select('device_token, platform')
      .eq('user_id', userId);

    if (tokenError || !tokens?.length) {
      console.log(`[send-module-notification] No device tokens for user ${userId}`);
      return new Response(
        JSON.stringify({ success: true, pushed: false, reason: 'no_tokens' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Send FCM notifications
    if (!firebaseServerKey) {
      console.error('[send-module-notification] Firebase server key not configured');
      return new Response(
        JSON.stringify({ success: true, pushed: false, reason: 'fcm_not_configured' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const channelId = getChannelId(type);
    const priority = getPriority(type);

    let successCount = 0;
    let failureCount = 0;

    for (const tokenRecord of tokens) {
      const fcmPayload = {
        to: tokenRecord.device_token,
        priority,
        notification: {
          title,
          body,
          sound: 'default',
          badge: 1,
          click_action: data?.route || '/'
        },
        data: {
          type,
          title,
          body,
          route: data?.route || '/',
          action: data?.action || 'view',
          ...data
        },
        android: {
          priority,
          notification: {
            channel_id: channelId,
            sound: 'default',
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          }
        },
        apns: {
          payload: {
            aps: {
              alert: { title, body },
              sound: 'default',
              badge: 1,
              'mutable-content': 1,
              'content-available': 1
            }
          }
        }
      };

      try {
        const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${firebaseServerKey}`
          },
          body: JSON.stringify(fcmPayload)
        });

        const fcmResult = await fcmResponse.json();

        if (fcmResult.success === 1) {
          successCount++;
          // Update last used timestamp
          await supabase
            .from('device_tokens')
            .update({ last_used_at: new Date().toISOString() })
            .eq('device_token', tokenRecord.device_token);
        } else {
          failureCount++;
          console.error('[send-module-notification] FCM error:', fcmResult);
          
          // Remove invalid tokens
          if (fcmResult.results?.[0]?.error === 'NotRegistered') {
            await supabase
              .from('device_tokens')
              .delete()
              .eq('device_token', tokenRecord.device_token);
          }
        }
      } catch (fcmError) {
        failureCount++;
        console.error('[send-module-notification] FCM request error:', fcmError);
      }
    }

    console.log(`[send-module-notification] Sent: ${successCount}, Failed: ${failureCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        pushed: successCount > 0,
        sent: successCount,
        failed: failureCount
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[send-module-notification] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
