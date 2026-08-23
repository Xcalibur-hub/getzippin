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
    // Use service role for payout operations
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

    const { transaction_id, recipient_type, recipient_id, amount, upi_id } = await req.json();

    if (!transaction_id || !recipient_type || !recipient_id || !amount || !upi_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate idempotency key
    const idempotencyKey = `payout_${transaction_id}_${recipient_type}_${recipient_id}`;

    // Check if payout already exists (idempotency)
    const { data: existingPayout } = await supabaseAdmin
      .from('payouts')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existingPayout) {
      return new Response(
        JSON.stringify({ 
          message: 'Payout already processed', 
          payout_id: existingPayout.id,
          idempotent: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert payout record
    const { data: payout, error: payoutError } = await supabaseAdmin
      .from('payouts')
      .insert({
        transaction_id: transaction_id,
        recipient_type: recipient_type,
        recipient_id: recipient_id,
        amount: amount,
        upi_id: upi_id,
        status: 'pending',
        idempotency_key: idempotencyKey
      })
      .select()
      .single();

    if (payoutError) {
      throw payoutError;
    }

    // Here you would integrate with actual UPI payment provider
    // For now, we just record the payout request
    // Example integration:
    // const paymentResponse = await fetch('https://payment-provider.com/api/payout', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${Deno.env.get('PAYMENT_API_KEY')}` },
    //   body: JSON.stringify({ upi_id, amount, reference: payout.id })
    // });

    // Update payout status based on provider response (simulated)
    const { error: updateError } = await supabaseAdmin
      .from('payouts')
      .update({ status: 'processing' })
      .eq('id', payout.id);

    if (updateError) {
      console.error('Failed to update payout status:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        payout_id: payout.id,
        recipient_type,
        recipient_id,
        amount,
        upi_id,
        status: 'processing',
        message: 'Payout initiated successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Payout error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
