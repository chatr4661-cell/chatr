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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { transaction_type, amount, description, reference_type, reference_id } = await req.json();

    if (!transaction_type || !amount || !description) {
      throw new Error('Missing required fields: transaction_type, amount, description');
    }

    // Get or create wallet
    let { data: wallet, error: walletError } = await supabase
      .from('health_wallet')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      const { data: newWallet, error: createError } = await supabase
        .from('health_wallet')
        .insert({ user_id: user.id, balance: 0 })
        .select()
        .single();

      if (createError) throw createError;
      wallet = newWallet;
    }

    let newBalance = wallet.balance;

    // Calculate new balance
    if (['credit', 'reward', 'refund'].includes(transaction_type)) {
      newBalance += parseFloat(amount);
    } else if (transaction_type === 'debit') {
      if (wallet.balance < parseFloat(amount)) {
        throw new Error('Insufficient balance');
      }
      newBalance -= parseFloat(amount);
    }

    // Create transaction
    const { data: transaction, error: transError } = await supabase
      .from('health_wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        user_id: user.id,
        transaction_type,
        amount: parseFloat(amount),
        balance_after: newBalance,
        description,
        reference_type,
        reference_id,
        status: 'completed'
      })
      .select()
      .single();

    if (transError) throw transError;

    // Update wallet balance
    const { error: updateError } = await supabase
      .from('health_wallet')
      .update({
        balance: newBalance,
        total_earned: transaction_type === 'credit' || transaction_type === 'reward' 
          ? wallet.total_earned + parseFloat(amount) 
          : wallet.total_earned,
        total_spent: transaction_type === 'debit' 
          ? wallet.total_spent + parseFloat(amount) 
          : wallet.total_spent
      })
      .eq('id', wallet.id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ 
        success: true,
        transaction,
        new_balance: newBalance
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Health wallet transaction error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});