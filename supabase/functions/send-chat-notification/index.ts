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
    const firebaseServerKey = Deno.env.get('FIREBASE_SERVER_KEY');

    if (!firebaseServerKey) {
      console.error('❌ FIREBASE_SERVER_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Firebase server key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { senderId, senderName, senderAvatar, receiverId, conversationId, messageContent, messageId, isGroup } = await req.json();

    console.log('💬 Chat notification request - Sender:', senderId, 'Receiver:', receiverId);

    if (!receiverId || !conversationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: receiverId, conversationId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all FCM tokens for the receiver from device_tokens table
    const { data: deviceTokens, error: tokenError } = await supabase
      .from('device_tokens')
      .select('device_token, platform')
      .eq('user_id', receiverId);

    if (tokenError) {
      console.error('Error fetching device tokens:', tokenError);
      throw tokenError;
    }

    if (!deviceTokens || deviceTokens.length === 0) {
      console.log('⚠️ No FCM tokens found for user:', receiverId);
      return new Response(
        JSON.stringify({ message: 'No FCM tokens registered for recipient' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📱 Found', deviceTokens.length, 'device(s) for recipient');

    // Build message data exactly as Android app expects
    const messageData = {
      id: messageId || crypto.randomUUID(),
      conversationId,
      senderId,
      content: messageContent,
      createdAt: new Date().toISOString()
    };

    const senderData = {
      id: senderId,
      username: senderName || 'Someone',
      avatar_url: senderAvatar || ''
    };

    const results = await Promise.allSettled(
      deviceTokens.map(async (tokenData: any) => {
        // Data-only message for Android to handle notification display
        const fcmPayload = {
          to: tokenData.device_token,
          data: {
            type: 'message',
            conversation_id: conversationId,
            message: JSON.stringify(messageData),
            sender: JSON.stringify(senderData),
            is_group: String(isGroup || false),
            is_silent: 'false'
          },
          android: {
            priority: 'high'
          },
          priority: 'high',
          content_available: true
        };

        console.log('📤 Sending FCM to:', tokenData.device_token.substring(0, 30) + '...');

        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${firebaseServerKey}`,
          },
          body: JSON.stringify(fcmPayload),
        });

        const result = await response.json();

        if (!response.ok || result.failure > 0) {
          console.error('❌ FCM Error:', result);
          
          // Remove invalid tokens
          if (result.results?.[0]?.error === 'NotRegistered' || 
              result.results?.[0]?.error === 'InvalidRegistration') {
            console.log('🗑️ Removing invalid token from database');
            await supabase
              .from('device_tokens')
              .delete()
              .eq('device_token', tokenData.device_token);
          }
          
          throw new Error(result.results?.[0]?.error || 'FCM request failed');
        }

        console.log('✅ FCM sent successfully:', result);
        
        // Update last_used_at
        await supabase
          .from('device_tokens')
          .update({ last_used_at: new Date().toISOString() })
          .eq('device_token', tokenData.device_token);

        return result;
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Chat notification sent to ${successful} device(s), failed: ${failed}`);

    return new Response(
      JSON.stringify({ success: true, sentTo: successful, failed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error sending chat notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
