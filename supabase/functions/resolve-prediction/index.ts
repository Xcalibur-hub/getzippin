import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { prediction_id, correct_option } = await req.json();

    if (!prediction_id || !correct_option) {
      return new Response(
        JSON.stringify({ error: 'Missing prediction_id or correct_option' }),
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

    if (prediction.closes_at && new Date(prediction.closes_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Prediction already closed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update prediction with correct option and close it
    const { error: updateError } = await supabase
      .from('predictions')
      .update({ 
        correct_option, 
        closes_at: new Date().toISOString() 
      })
      .eq('id', prediction_id);

    if (updateError) {
      throw updateError;
    }

    // Fetch all karma transactions for this prediction
    const { data: transactions, error: txError } = await supabase
      .from('karma_transactions')
      .select('*')
      .eq('prediction_id', prediction_id);

    if (txError) {
      throw txError;
    }

    if (!transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No bets placed on this prediction',
          winners: []
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Calculate total pool and total staked on correct option
    const totalPool = transactions.reduce((sum, tx) => sum + (tx.amount_staked || 0), 0);
    const correctBets = transactions.filter(tx => tx.option === correct_option);
    const totalStakedOnCorrect = correctBets.reduce((sum, tx) => sum + (tx.amount_staked || 0), 0);

    const winners = [];

    if (totalStakedOnCorrect > 0) {
      // Update each winning transaction
      for (const tx of correctBets) {
        const winnings = Math.floor(tx.amount_staked * (totalPool / totalStakedOnCorrect));
        
        // Update karma_transactions with amount_won
        const { error: txUpdateError } = await supabase
          .from('karma_transactions')
          .update({ amount_won: winnings })
          .eq('id', tx.id);

        if (txUpdateError) {
          console.error(`Failed to update transaction ${tx.id}:`, txUpdateError);
          continue;
        }

        // Credit user's karma wallet
        const { data: wallet, error: walletError } = await supabase
          .from('karma_wallets')
          .select('balance, lifetime_earned')
          .eq('user_id', tx.user_id)
          .single();

        if (walletError) {
          console.error(`Failed to fetch wallet for user ${tx.user_id}:`, walletError);
          continue;
        }

        const { error: walletUpdateError } = await supabase
          .from('karma_wallets')
          .update({ 
            balance: (wallet.balance || 0) + winnings,
            lifetime_earned: (wallet.lifetime_earned || 0) + winnings
          })
          .eq('user_id', tx.user_id);

        if (walletUpdateError) {
          console.error(`Failed to update wallet for user ${tx.user_id}:`, walletUpdateError);
          continue;
        }

        // Update leaderboard (+5 score for winners)
        const { data: leaderboard } = await supabase
          .from('leaderboards')
          .select('score')
          .eq('user_id', tx.user_id)
          .single();

        if (leaderboard) {
          await supabase
            .from('leaderboards')
            .update({ score: (leaderboard.score || 0) + 5 })
            .eq('user_id', tx.user_id);
        }

        winners.push({
          user_id: tx.user_id,
          amount_staked: tx.amount_staked,
          amount_won: winnings
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Prediction resolved successfully',
        total_pool: totalPool,
        total_staked_on_correct: totalStakedOnCorrect,
        winners_count: winners.length,
        winners
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error resolving prediction:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
