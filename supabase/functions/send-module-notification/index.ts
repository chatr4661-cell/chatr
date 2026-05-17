import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getOAuth2AccessToken, loadServiceAccount, sendFcmV1Message } from "../_shared/fcmV1.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  skipInAppInsert?: boolean;
}

const FN = 'send-module-notification';

const getChannelId = (type: string): string => {
  if (type.includes('call')) return 'chatr_calls';
  if (type.includes('message') || type.includes('chat')) return 'chatr_messages';
  if (type.includes('payment') || type.includes('wallet')) return 'chatr_payments';
  if (type.includes('health') || type.includes('medication')) return 'chatr_health';
  if (type.includes('food') || type.includes('order')) return 'chatr_orders';
  if (type.includes('appointment') || type.includes('booking')) return 'chatr_bookings';
  return 'chatr_general';
};

const getPriority = (type: string): 'HIGH' | 'NORMAL' => {
  if (type.includes('call') || type.includes('alert') || type.includes('urgent')) return 'HIGH';
  if (type.includes('reminder') || type.includes('payment')) return 'HIGH';
  return 'NORMAL';
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, type, title, body, data, skipInAppInsert } =
      (await req.json()) as NotificationRequest;

    if (!userId || !type || !title || !body) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[${FN}] type=${type} user=${userId} skipInsert=${!!skipInAppInsert}`);

    if (!skipInAppInsert) {
      const { error: dbError } = await supabase.from('notifications').insert({
        user_id: userId,
        title,
        message: body,
        type,
        data: data || {},
        read: false,
        created_at: new Date().toISOString(),
      });
      if (dbError) console.error(`[${FN}] DB insert error:`, dbError);
    }

    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (prefs?.push_enabled === false) {
      return new Response(
        JSON.stringify({ success: true, pushed: false, reason: 'push_disabled' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: tokens, error: tokenError } = await supabase
      .from('device_tokens')
      .select('device_token, platform')
      .eq('user_id', userId);

    if (tokenError || !tokens?.length) {
      return new Response(
        JSON.stringify({ success: true, pushed: false, reason: 'no_tokens' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let serviceAccount;
    try {
      serviceAccount = loadServiceAccount();
    } catch (e) {
      console.error(`[${FN}]`, e);
      return new Response(
        JSON.stringify({ success: true, pushed: false, reason: 'fcm_not_configured' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const projectId = serviceAccount.project_id;
    const accessToken = await getOAuth2AccessToken(serviceAccount);

    const channelId = getChannelId(type);
    const priority = getPriority(type);

    let successCount = 0;
    let failureCount = 0;

    const dataPayload: Record<string, string> = {
      type,
      title,
      body,
      route: data?.route || '/',
      action: data?.action || 'view',
    };
    if (data) {
      for (const [k, v] of Object.entries(data)) {
        if (v !== null && v !== undefined) dataPayload[k] = String(v);
      }
    }

    for (const tokenRecord of tokens) {
      const result = await sendFcmV1Message({
        projectId,
        accessToken,
        fcmToken: tokenRecord.device_token,
        functionName: FN,
        message: {
          data: dataPayload,
          android: {
            priority,
            ttl: '3600s',
            notification: { channel_id: channelId },
          },
        },
      });

      if (result.success) {
        successCount++;
        await supabase
          .from('device_tokens')
          .update({ last_used_at: new Date().toISOString() })
          .eq('device_token', tokenRecord.device_token);
      } else {
        failureCount++;
        if (result.isUnregistered) {
          await supabase.from('device_tokens').delete().eq('device_token', tokenRecord.device_token);
        }
      }
    }

    console.log(`[${FN}] sent=${successCount} failed=${failureCount}`);

    return new Response(
      JSON.stringify({ success: true, pushed: successCount > 0, sent: successCount, failed: failureCount, api: 'v1' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(`[${FN}] error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
