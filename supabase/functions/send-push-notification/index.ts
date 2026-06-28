import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getOAuth2AccessToken, loadServiceAccount, sendFcmV1Message } from "../_shared/fcmV1.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  notificationType?: string;
}

const FN = 'send-push-notification';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, title, body, data, notificationType } =
      (await req.json()) as PushNotificationRequest;

    console.log(`[${FN}] Sending push to user=${userId} type=${notificationType}`);

    // Notification preferences
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (preferences) {
      const typeMapping: Record<string, keyof typeof preferences> = {
        chat: 'chat_notifications',
        call: 'call_notifications',
        group: 'group_notifications',
        transaction: 'transaction_alerts',
        update: 'app_updates',
        marketing: 'marketing_alerts',
      };
      const prefKey = typeMapping[notificationType || 'chat'];
      if (prefKey && !preferences[prefKey]) {
        console.log(`[${FN}] User disabled type=${notificationType}`);
        return new Response(
          JSON.stringify({ success: false, message: 'User disabled type' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        );
      }
    }

    const { data: deviceTokens, error: tokenError } = await supabase
      .from('device_tokens')
      .select('device_token, platform')
      .eq('user_id', userId);

    if (tokenError) throw tokenError;

    if (!deviceTokens || deviceTokens.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No device tokens' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    const serviceAccount = loadServiceAccount();
    const projectId = serviceAccount.project_id;
    const accessToken = await getOAuth2AccessToken(serviceAccount);

    const results = await Promise.allSettled(
      deviceTokens.map(async (t) => {
        // DATA-ONLY (native app builds the notification)
        const dataPayload: Record<string, string> = {
          type: 'general',
          title: String(title || ''),
          body: String(body || ''),
          notificationType: String(notificationType || 'general'),
          // Native app builds the notification on this channel (data-only on Android)
          android_channel_id: 'messages_visible_v2',
          timestamp: new Date().toISOString(),
        };
        if (data && typeof data === 'object') {
          for (const [k, v] of Object.entries(data)) {
            if (v !== null && v !== undefined) dataPayload[k] = String(v);
          }
        }

        const isAndroid = (t.platform || 'android').toLowerCase() === 'android';
        const result = await sendFcmV1Message({
          projectId,
          accessToken,
          fcmToken: t.device_token,
          functionName: FN,
          message: {
            data: dataPayload,
            android: { priority: 'HIGH' },
            // iOS/web get an OS-rendered notification; Android stays data-only.
            ...(isAndroid ? {} : { notification: { title: String(title || ''), body: String(body || '') } }),
          },
        });


        if (!result.success) {
          if (result.isUnregistered) {
            await supabase.from('device_tokens').delete().eq('device_token', t.device_token);
          }
          throw new Error(result.error);
        }
        await supabase
          .from('device_tokens')
          .update({ last_used_at: new Date().toISOString() })
          .eq('device_token', t.device_token);
        return result;
      }),
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(`[${FN}] sent=${successful} failed=${failed}`);

    return new Response(
      JSON.stringify({ success: true, sentTo: successful, failed, api: 'v1' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error(`[${FN}] error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
