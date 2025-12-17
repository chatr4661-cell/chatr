import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MessageNotification {
  type: 'message';
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  conversationId: string;
  messageContent: string;
  messageId: string;
  isGroup?: boolean;
}

interface CallNotification {
  type: 'call';
  receiverId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callId: string;
  callType: 'audio' | 'video';
}

type NotificationPayload = MessageNotification | CallNotification;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firebaseServerKey = Deno.env.get('FIREBASE_SERVER_KEY')!;
    
    if (!firebaseServerKey) {
      console.error('❌ FIREBASE_SERVER_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Firebase server key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload = await req.json() as NotificationPayload;

    console.log('📲 FCM Notification Request:', payload.type);

    if (payload.type === 'message') {
      return await handleMessageNotification(supabase, firebaseServerKey, payload);
    } else if (payload.type === 'call') {
      return await handleCallNotification(supabase, firebaseServerKey, payload);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid notification type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ Error in fcm-notify:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleMessageNotification(
  supabase: any,
  firebaseServerKey: string,
  payload: MessageNotification
) {
  const { recipientId, senderId, senderName, senderAvatar, conversationId, messageContent, messageId, isGroup } = payload;

  console.log('💬 Processing message notification for recipient:', recipientId);

  // Get all FCM tokens for the recipient
  const { data: deviceTokens, error: tokenError } = await supabase
    .from('device_tokens')
    .select('device_token, platform')
    .eq('user_id', recipientId);

  if (tokenError) {
    console.error('Error fetching device tokens:', tokenError);
    throw tokenError;
  }

  if (!deviceTokens || deviceTokens.length === 0) {
    console.log('⚠️ No FCM tokens found for recipient:', recipientId);
    return new Response(
      JSON.stringify({ success: false, message: 'No device tokens found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('📱 Found', deviceTokens.length, 'device(s) for recipient');

  // Build message data exactly as Android app expects
  const messageData = {
    id: messageId,
    conversationId,
    senderId,
    content: messageContent,
    createdAt: new Date().toISOString()
  };

  const senderData = {
    id: senderId,
    username: senderName,
    avatar_url: senderAvatar || ''
  };

  const results = await Promise.allSettled(
    deviceTokens.map(async (tokenData: any) => {
      // Data-only message for Android (allows app to handle display)
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
        
        // If token is invalid, remove it from database
        if (result.results?.[0]?.error === 'NotRegistered' || 
            result.results?.[0]?.error === 'InvalidRegistration') {
          console.log('🗑️ Removing invalid token');
          await supabase
            .from('device_tokens')
            .delete()
            .eq('device_token', tokenData.device_token);
        }
        
        throw new Error(result.results?.[0]?.error || 'FCM failed');
      }

      console.log('✅ FCM Success:', result);
      
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

  console.log(`✅ Message notification sent to ${successful} device(s), failed: ${failed}`);

  return new Response(
    JSON.stringify({ success: true, sentTo: successful, failed }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleCallNotification(
  supabase: any,
  firebaseServerKey: string,
  payload: CallNotification
) {
  const { receiverId, callerId, callerName, callerAvatar, callId, callType } = payload;

  console.log('📞 Processing CALL notification for receiver:', receiverId, 'IMMEDIATELY!');

  // Get all FCM tokens for the receiver
  const { data: deviceTokens, error: tokenError } = await supabase
    .from('device_tokens')
    .select('device_token, platform')
    .eq('user_id', receiverId);

  if (tokenError) {
    console.error('Error fetching device tokens:', tokenError);
    throw tokenError;
  }

  if (!deviceTokens || deviceTokens.length === 0) {
    console.log('⚠️ No FCM tokens found for receiver:', receiverId);
    return new Response(
      JSON.stringify({ success: false, message: 'No device tokens found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('📱 Found', deviceTokens.length, 'device(s) for call receiver');

  const results = await Promise.allSettled(
    deviceTokens.map(async (tokenData: any) => {
      // High-priority data-only message for incoming call
      const fcmPayload = {
        to: tokenData.device_token,
        data: {
          type: 'call',
          call_id: callId,
          caller_id: callerId,
          caller_name: callerName,
          caller_avatar: callerAvatar || '',
          call_type: callType
        },
        android: {
          priority: 'high'
        },
        priority: 'high',
        content_available: true,
        time_to_live: 60 // Call should be answered within 60 seconds
      };

      console.log('📤 Sending CALL FCM to:', tokenData.device_token.substring(0, 30) + '...');

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
        console.error('❌ FCM Call Error:', result);
        
        // Remove invalid tokens
        if (result.results?.[0]?.error === 'NotRegistered' || 
            result.results?.[0]?.error === 'InvalidRegistration') {
          console.log('🗑️ Removing invalid token');
          await supabase
            .from('device_tokens')
            .delete()
            .eq('device_token', tokenData.device_token);
        }
        
        throw new Error(result.results?.[0]?.error || 'FCM failed');
      }

      console.log('✅ FCM Call Success:', result);
      
      await supabase
        .from('device_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('device_token', tokenData.device_token);

      return result;
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`✅ Call notification sent to ${successful} device(s), failed: ${failed}`);

  return new Response(
    JSON.stringify({ success: true, sentTo: successful, failed }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
