import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { action, receiverToken, amount, description } = await req.json();

    if (action === "initiate") {
      // Find receiver by QR token
      const { data: receiver } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('qr_code_token', receiverToken)
        .single();

      if (!receiver) {
        throw new Error("Invalid QR code");
      }

      if (receiver.id === user.id) {
        throw new Error("Cannot pay yourself");
      }

      // Check payer balance
      const { data: payerPoints } = await supabase
        .from('user_points')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (!payerPoints || payerPoints.balance < amount) {
        throw new Error("Insufficient points");
      }

      // Create QR payment record
      const qrToken = crypto.randomUUID();
      const { data: payment, error: paymentError } = await supabase
        .from('qr_payments')
        .insert({
          payer_id: user.id,
          receiver_id: receiver.id,
          amount_points: amount,
          transaction_type: 'qr_scan',
          qr_token: qrToken,
          description: description || 'QR Payment',
          status: 'pending'
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      return new Response(
        JSON.stringify({ 
          success: true, 
          payment,
          receiverName: receiver.username
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "confirm") {
      const { paymentId } = await req.json();

      // Get payment details
      const { data: payment } = await supabase
        .from('qr_payments')
        .select('*')
        .eq('id', paymentId)
        .eq('payer_id', user.id)
        .single();

      if (!payment || payment.status !== 'pending') {
        throw new Error("Invalid payment");
      }

      // Execute point transfer
      const { data: payerPoints } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', payment.payer_id)
        .single();

      const { data: receiverPoints } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', payment.receiver_id)
        .single();

      if (payerPoints.balance < payment.amount_points) {
        throw new Error("Insufficient balance");
      }

      // Deduct from payer
      await supabase
        .from('user_points')
        .update({
          balance: payerPoints.balance - payment.amount_points,
          lifetime_spent: payerPoints.lifetime_spent + payment.amount_points
        })
        .eq('user_id', payment.payer_id);

      // Add to receiver
      await supabase
        .from('user_points')
        .update({
          balance: receiverPoints.balance + payment.amount_points,
          lifetime_earned: receiverPoints.lifetime_earned + payment.amount_points
        })
        .eq('user_id', payment.receiver_id);

      // Create transaction records
      await supabase.from('point_transactions').insert([
        {
          user_id: payment.payer_id,
          amount: -payment.amount_points,
          transaction_type: 'spend',
          source: 'qr_payment',
          description: `QR Payment to user`,
          reference_id: payment.id,
          reference_type: 'qr_payment'
        },
        {
          user_id: payment.receiver_id,
          amount: payment.amount_points,
          transaction_type: 'earn',
          source: 'qr_payment_received',
          description: `QR Payment received`,
          reference_id: payment.id,
          reference_type: 'qr_payment'
        }
      ]);

      // Update payment status
      await supabase
        .from('qr_payments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      return new Response(
        JSON.stringify({ success: true, message: "Payment completed successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});