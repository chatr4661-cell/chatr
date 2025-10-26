import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY');

serve(async (req) => {
  try {
    const { senderId, senderName, senderAvatar, receiverId, conversationId, messageContent } = await req.json();

    if (!receiverId || !conversationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get receiver's FCM token from Firestore
    // This requires Firebase Admin SDK or direct Firestore REST API call
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/chatr-91067/databases/(default)/documents/users/${receiverId}`;
    
    const userResponse = await fetch(firestoreUrl, {
      headers: {
        'Authorization': `Bearer ${FIREBASE_SERVER_KEY}`,
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to get user FCM token');
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userData = await userResponse.json();
    const fcmToken = userData.fields?.fcmToken?.stringValue;

    if (!fcmToken) {
      console.log('No FCM token for user:', receiverId);
      return new Response(
        JSON.stringify({ message: 'No FCM token registered' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send push notification via FCM
    const fcmUrl = 'https://fcm.googleapis.com/fcm/send';
    
    const notification = {
      to: fcmToken,
      notification: {
        title: senderName || 'New Message',
        body: messageContent || 'You have a new message',
        icon: senderAvatar || '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'chatr-message',
        requireInteraction: true,
        click_action: `https://chatr.chat/chat?conversation=${conversationId}`,
      },
      data: {
        conversationId,
        senderId,
        senderName,
        type: 'new_message',
      },
      priority: 'high',
    };

    const fcmResponse = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FIREBASE_SERVER_KEY}`,
      },
      body: JSON.stringify(notification),
    });

    const fcmResult = await fcmResponse.json();

    if (fcmResponse.ok) {
      console.log('✅ Push notification sent successfully');
      return new Response(
        JSON.stringify({ success: true, result: fcmResult }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('Failed to send push notification:', fcmResult);
      return new Response(
        JSON.stringify({ error: 'Failed to send notification', details: fcmResult }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
