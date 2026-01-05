import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  type: string;
  bookingId?: string;
  providerId?: string;
  customerId?: string;
  customerName?: string;
  providerName?: string;
  serviceName?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  status?: string;
  category?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firebaseServerKey = Deno.env.get('FIREBASE_SERVER_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);
    const payload: NotificationRequest = await req.json();

    console.log('📬 Service notification request:', payload);

    let targetUserId: string | undefined;
    let title = '';
    let body = '';
    let data: Record<string, string> = {};

    switch (payload.type) {
      case 'new_booking':
        // Notify provider of new booking
        targetUserId = payload.providerId;
        title = '🔔 New Booking Request!';
        body = `${payload.customerName || 'Customer'} booked ${payload.serviceName || 'a service'} for ${payload.scheduledDate} at ${payload.scheduledTime}`;
        data = { 
          type: 'new_booking', 
          bookingId: payload.bookingId || '',
          screen: '/vendor/provider-dashboard'
        };
        break;

      case 'booking_accepted':
        // Notify customer that provider accepted
        targetUserId = payload.customerId;
        title = '✅ Booking Confirmed!';
        body = 'Your service provider has accepted your booking. They will arrive at the scheduled time.';
        data = { 
          type: 'booking_accepted', 
          bookingId: payload.bookingId || '',
          screen: `/services/tracking/${payload.bookingId}`
        };
        break;

      case 'booking_en_route':
        // Notify customer that provider is on the way
        targetUserId = payload.customerId;
        title = '🚗 Provider On The Way!';
        body = 'Your service provider is heading to your location. Track their arrival in the app.';
        data = { 
          type: 'booking_en_route', 
          bookingId: payload.bookingId || '',
          screen: `/services/tracking/${payload.bookingId}`
        };
        break;

      case 'booking_arrived':
        // Notify customer that provider arrived
        targetUserId = payload.customerId;
        title = '📍 Provider Arrived!';
        body = 'Your service provider has arrived at your location.';
        data = { 
          type: 'booking_arrived', 
          bookingId: payload.bookingId || '',
          screen: `/services/tracking/${payload.bookingId}`
        };
        break;

      case 'booking_in_progress':
        // Notify customer that work started
        targetUserId = payload.customerId;
        title = '🔧 Work Started!';
        body = 'Your service provider has started working on your request.';
        data = { 
          type: 'booking_in_progress', 
          bookingId: payload.bookingId || '',
          screen: `/services/tracking/${payload.bookingId}`
        };
        break;

      case 'booking_completed':
        // Notify customer that work is done
        targetUserId = payload.customerId;
        title = '🎉 Service Completed!';
        body = 'Your service has been completed. Please rate your experience!';
        data = { 
          type: 'booking_completed', 
          bookingId: payload.bookingId || '',
          screen: `/services/review/${payload.bookingId}`
        };
        break;

      case 'booking_cancelled':
        // Notify both parties
        targetUserId = payload.customerId || payload.providerId;
        title = '❌ Booking Cancelled';
        body = 'The booking has been cancelled.';
        data = { 
          type: 'booking_cancelled', 
          bookingId: payload.bookingId || '',
          screen: '/services/history'
        };
        break;

      case 'provider_registration':
        // Admin notification - skip push, just log
        console.log('New provider registration:', payload.providerName);
        return new Response(JSON.stringify({ success: true, message: 'Registration logged' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        console.log('Unknown notification type:', payload.type);
        return new Response(JSON.stringify({ error: 'Unknown notification type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    if (!targetUserId) {
      console.log('No target user ID provided');
      return new Response(JSON.stringify({ error: 'No target user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get device tokens for the target user
    const { data: tokens, error: tokensError } = await supabase
      .from('device_tokens')
      .select('token, platform')
      .eq('user_id', targetUserId);

    if (tokensError) {
      console.error('Error fetching tokens:', tokensError);
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      console.log('No device tokens found for user:', targetUserId);
      
      // Store notification in database for in-app display
      await supabase.from('vendor_notifications').insert({
        vendor_id: targetUserId,
        title: title,
        message: body,
        type: payload.type,
        action_url: data.screen,
        is_read: false
      });

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Notification stored (no device tokens)' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Send FCM notifications
    let successCount = 0;
    let failCount = 0;

    for (const tokenRecord of tokens) {
      try {
        if (!firebaseServerKey) {
          console.log('Firebase server key not configured');
          continue;
        }

        const fcmPayload = {
          to: tokenRecord.token,
          notification: {
            title: title,
            body: body,
            sound: 'default',
            badge: 1
          },
          data: data,
          priority: 'high',
          android: {
            notification: {
              channel_id: 'service_updates',
              priority: 'high',
              default_vibrate_timings: true,
              default_sound: true
            }
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
                'content-available': 1
              }
            }
          }
        };

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
          console.log('✅ FCM notification sent successfully');
        } else {
          failCount++;
          console.log('❌ FCM notification failed:', fcmResult);
        }
      } catch (err) {
        failCount++;
        console.error('FCM send error:', err);
      }
    }

    // Also store notification in database
    await supabase.from('vendor_notifications').insert({
      vendor_id: targetUserId,
      title: title,
      message: body,
      type: payload.type,
      action_url: data.screen,
      is_read: false
    });

    console.log(`📊 Notification results: ${successCount} sent, ${failCount} failed`);

    return new Response(JSON.stringify({ 
      success: true, 
      sent: successCount, 
      failed: failCount 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Service notification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
