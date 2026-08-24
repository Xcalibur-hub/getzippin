import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, prediction_id, option, amount } = await req.json();

    if (!user_id || !prediction_id || !option || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Amount must be positive' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch prediction details
    const { data: prediction, error: predError } = await supabase
      .from('predictions')
      .select('*')
      .eq('id', prediction_id)
      .single();

    if (predError || !prediction) {
      return new Response(
        JSON.stringify({ error: 'Prediction not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if prediction is still open
    if (prediction.closes_at && new Date(prediction.closes_at) <= new Date()) {
      return new Response(
        JSON.stringify({ error: 'Prediction is closed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user's karma wallet
    const { data: wallet, error: walletError } = await supabase
      .from('karma_wallets')
      .select('balance')
      .eq('user_id', user_id)
      .single();

    if (walletError || !wallet) {
      return new Response(
        JSON.stringify({ error: 'Karma wallet not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check sufficient balance
    if (wallet.balance < amount) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient karma balance',
          current_balance: wallet.balance,
          required: amount
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Deduct from karma wallet
    const { error: deductError } = await supabase
      .from('karma_wallets')
      .update({ balance: wallet.balance - amount })
      .eq('user_id', user_id);

    if (deductError) {
      throw deductError;
    }

    // Insert karma transaction
    const { data: newTx, error: txError } = await supabase
      .from('karma_transactions')
      .insert({
        user_id,
        prediction_id,
        option,
        amount_staked: amount,
        amount_won: 0
      })
      .select()
      .single();

    if (txError) {
      throw txError;
    }

    // Update prediction total_karma_staked
    const { error: updatePredError } = await supabase
      .from('predictions')
      .update({ total_karma_staked: (prediction.total_karma_staked || 0) + amount })
      .eq('id', prediction_id);

    if (updatePredError) {
      throw updatePredError;
    }

    // Fetch updated wallet balance
    const { data: updatedWallet } = await supabase
      .from('karma_wallets')
      .select('balance')
      .eq('user_id', user_id)
      .single();

    return new Response(
      JSON.stringify({
        message: 'Bet placed successfully',
        transaction: newTx,
        new_balance: updatedWallet?.balance || 0
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error placing bet:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
