import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getOAuth2AccessToken, loadServiceAccount, sendFcmV1Message } from "../_shared/fcmV1.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const FN = 'notify-referral-join';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { newUserId, inviteCode, referrerId } = await req.json();

    console.log(`[${FN}] join newUserId=${newUserId} inviteCode=${inviteCode}`);

    const { data: newUserProfile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', newUserId)
      .single();

    const newUserName = newUserProfile?.username || 'A friend';

    let inviterId = referrerId;
    if (!inviterId && inviteCode) {
      const { data: invite } = await supabase
        .from('contact_invites')
        .select('inviter_id')
        .eq('invite_code', inviteCode)
        .single();
      inviterId = invite?.inviter_id;
    }

    if (!inviterId) {
      console.log(`[${FN}] no inviter`);
      return new Response(
        JSON.stringify({ success: false, message: 'No inviter found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (inviteCode) {
      await supabase
        .from('contact_invites')
        .update({
          status: 'joined',
          joined_at: new Date().toISOString(),
          joined_user_id: newUserId,
          reward_given: true,
        })
        .eq('invite_code', inviteCode);
    }

    // Always create in-app notification
    await supabase.from('notifications').insert({
      user_id: inviterId,
      title: '🎉 Friend Joined!',
      message: `${newUserName} joined Chatr using your invite! You earned 50 coins!`,
      type: 'referral',
      data: { newUserId, coinsEarned: 50 },
      read: false,
    });

    const { data: deviceTokens } = await supabase
      .from('device_tokens')
      .select('device_token')
      .eq('user_id', inviterId);

    if (!deviceTokens || deviceTokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'In-app notification created', pushed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let serviceAccount;
    try {
      serviceAccount = loadServiceAccount();
    } catch (e) {
      console.error(`[${FN}]`, e);
      return new Response(
        JSON.stringify({ success: true, pushed: 0, reason: 'fcm_not_configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const projectId = serviceAccount.project_id;
    const accessToken = await getOAuth2AccessToken(serviceAccount);

    const results = await Promise.allSettled(
      deviceTokens.map(async ({ device_token }) => {
        const result = await sendFcmV1Message({
          projectId,
          accessToken,
          fcmToken: device_token,
          functionName: FN,
          message: {
            // DATA-ONLY on Android — native app builds the notification.
            data: {
              type: 'referral_join',
              title: '🎉 Friend Joined Chatr!',
              body: `${newUserName} joined using your invite! You earned 50 coins!`,
              newUserId: String(newUserId),
              coinsEarned: '50',
              route: '/chatr-points',
              android_channel_id: 'messages_visible_v2',
              timestamp: Date.now().toString(),
            },
            android: {
              priority: 'HIGH',
            },
          },

        });
        if (!result.success) {
          if (result.isUnregistered) {
            await supabase.from('device_tokens').delete().eq('device_token', device_token);
          }
          throw new Error(result.error);
        }
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
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
