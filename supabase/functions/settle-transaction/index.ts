import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { claim_id, verdict } = await req.json();

    if (!claim_id || !verdict) {
      return new Response(
        JSON.stringify({ error: 'Missing claim_id or verdict' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If not approved, reject and return
    if (verdict !== 'approved') {
      const { error: updateError } = await supabase
        .from('drop_claims')
        .update({ status: 'rejected' })
        .eq('id', claim_id);

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({ status: 'rejected', claim_id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for transaction operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Lock and fetch claim with related data
    const { data: claim, error: claimError } = await supabaseAdmin
      .from('drop_claims')
      .select(`
        *,
        drops (
          campaign_id,
          creator_id,
          code
        ),
        campaigns (
          merchant_id,
          cashback_amount,
          total_budget,
          spent_budget
        ),
        merchants (
          id,
          wallet_balance,
          credit_limit,
          upi_id
        ),
        creators (
          user_id
        )
      `)
      .eq('id', claim_id)
      .single();

    if (claimError || !claim) {
      throw new Error('Claim not found');
    }

    // Check claim is still 'claimed'
    if (claim.status !== 'claimed') {
      return new Response(
        JSON.stringify({ error: 'Claim already processed', current_status: claim.status }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const drop = claim.drops;
    const campaign = claim.campaigns;
    const merchant = claim.merchants;
    const creator = claim.creators;

    if (!campaign || !merchant) {
      throw new Error('Related data not found');
    }

    const cashbackAmount = campaign.cashback_amount || 80;
    const merchantBalance = merchant.wallet_balance || 0;
    const merchantCredit = merchant.credit_limit || 5000;
    const availableFunds = merchantBalance + merchantCredit;

    // Check merchant has sufficient funds
    if (availableFunds < cashbackAmount) {
      return new Response(
        JSON.stringify({ error: 'Insufficient merchant funds', available: availableFunds, required: cashbackAmount }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate deductions
    let newWalletBalance = merchantBalance;
    let newCreditLimit = merchantCredit;
    
    if (merchantBalance >= cashbackAmount) {
      newWalletBalance = merchantBalance - cashbackAmount;
    } else {
      const remainingFromCredit = cashbackAmount - merchantBalance;
      newWalletBalance = 0;
      newCreditLimit = merchantCredit - remainingFromCredit;
    }

    // Split amounts
    const userCredit = Math.floor(cashbackAmount * 0.5); // 40
    const creatorCredit = Math.floor(cashbackAmount * 0.25); // 20
    const platformRevenue = cashbackAmount - userCredit - creatorCredit; // 20

    // Get user details for the claim
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('upi_id, neighborhood')
      .eq('id', claim.user_id)
      .single();

    // Get creator UPI ID
    const { data: creatorUser } = await supabaseAdmin
      .from('users')
      .select('upi_id')
      .eq('id', creator?.user_id)
      .single();

    // Perform updates in sequence (transaction-like behavior)
    // 1. Update merchant balance/credit
    const { error: merchantUpdateError } = await supabaseAdmin
      .from('merchants')
      .update({ 
        wallet_balance: newWalletBalance,
        credit_limit: newCreditLimit
      })
      .eq('id', merchant.id);

    if (merchantUpdateError) throw merchantUpdateError;

    // 2. Insert transaction
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        claim_id: claim_id,
        amount: cashbackAmount,
        merchant_debit: cashbackAmount,
        user_credit: userCredit,
        creator_credit: creatorCredit,
        platform_revenue: platformRevenue,
        status: 'completed'
      })
      .select()
      .single();

    if (txError) throw txError;

    // 3. Update drop_claim status
    const { error: claimUpdateError } = await supabaseAdmin
      .from('drop_claims')
      .update({ 
        status: 'verified',
        verified_at: new Date().toISOString()
      })
      .eq('id', claim_id);

    if (claimUpdateError) throw claimUpdateError;

    // 4. Update campaign spent_budget
    const { error: campaignUpdateError } = await supabaseAdmin
      .from('campaigns')
      .update({ 
        spent_budget: (campaign.spent_budget || 0) + cashbackAmount
      })
      .eq('id', campaign.id);

    if (campaignUpdateError) throw campaignUpdateError;

    // 5. Update drop verified_count
    const { error: dropUpdateError } = await supabaseAdmin
      .from('drops')
      .update({ 
        verified_count: (drop.verified_count || 0) + 1
      })
      .eq('id', drop.id);

    if (dropUpdateError) throw dropUpdateError;

    // 6. Update leaderboards (increment score by 10)
    const neighborhood = userData?.neighborhood || 'default';
    
    // Check if leaderboard entry exists
    const { data: existingLeaderboard } = await supabaseAdmin
      .from('leaderboards')
      .select('id, score')
      .eq('user_id', claim.user_id)
      .single();

    if (existingLeaderboard) {
      const { error: lbUpdateError } = await supabaseAdmin
        .from('leaderboards')
        .update({ 
          score: (existingLeaderboard.score || 0) + 10,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', claim.user_id);
      
      if (lbUpdateError) throw lbUpdateError;
    } else {
      const { error: lbInsertError } = await supabaseAdmin
        .from('leaderboards')
        .insert({
          user_id: claim.user_id,
          neighborhood: neighborhood,
          badge_name: 'Newcomer',
          score: 10,
          rank: null,
          updated_at: new Date().toISOString()
        });
      
      if (lbInsertError) throw lbInsertError;
    }

    // After commit, trigger payouts asynchronously
    const payoutsPromises = [];

    // Payout to user
    if (userData?.upi_id) {
      const userPayoutPromise = supabaseAdmin.functions.invoke('create-payout', {
        body: {
          transaction_id: transaction.id,
          recipient_type: 'user',
          recipient_id: claim.user_id,
          amount: userCredit,
          upi_id: userData.upi_id
        }
      });
      payoutsPromises.push(userPayoutPromise);
    }

    // Payout to creator
    if (creatorUser?.upi_id && creatorCredit > 0) {
      const creatorPayoutPromise = supabaseAdmin.functions.invoke('create-payout', {
        body: {
          transaction_id: transaction.id,
          recipient_type: 'creator',
          recipient_id: creator?.user_id,
          amount: creatorCredit,
          upi_id: creatorUser.upi_id
        }
      });
      payoutsPromises.push(creatorPayoutPromise);
    }

    // Fire and forget payouts (don't wait for completion)
    Promise.allSettled(payoutsPromises).catch(console.error);

    return new Response(
      JSON.stringify({
        success: true,
        transaction: transaction,
        verdict: 'approved',
        message: 'Transaction settled successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Settlement error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
