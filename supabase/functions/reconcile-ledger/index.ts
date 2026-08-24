import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all transactions from last 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', twentyFourHoursAgo.toISOString());

    if (txError) {
      throw txError;
    }

    // Group by status and check ledger balance
    const groupedByStatus: Record<string, any[]> = {};
    let totalDebits = 0;
    let totalCredits = 0;
    const flaggedTransactions: string[] = [];

    for (const tx of transactions || []) {
      const status = tx.status || 'unknown';
      if (!groupedByStatus[status]) {
        groupedByStatus[status] = [];
      }
      groupedByStatus[status].push(tx);

      totalDebits += parseFloat(tx.merchant_debit || 0);
      totalCredits += 
        parseFloat(tx.user_credit || 0) + 
        parseFloat(tx.creator_credit || 0) + 
        parseFloat(tx.platform_revenue || 0);
    }

    // Check if ledger balances
    const ledgerBalanced = Math.abs(totalDebits - totalCredits) < 0.01; // Allow small floating point errors

    if (!ledgerBalanced) {
      console.error(`Ledger imbalance detected! Debits: ${totalDebits}, Credits: ${totalCredits}`);
      // Flag all transactions in the imbalanced period
      for (const tx of transactions || []) {
        flaggedTransactions.push(tx.id);
      }
    }

    // Fetch payouts with status 'pending' or 'processing'
    const { data: payouts, error: payoutError } = await supabase
      .from('payouts')
      .select('*')
      .in('status', ['pending', 'processing']);

    if (payoutError) {
      throw payoutError;
    }

    // Mock payout status updates (simulate RazorpayX response)
    const updatedPayouts: any[] = [];
    for (const payout of payouts || []) {
      // Simulate API check - in production, call actual RazorpayX API
      const mockSuccess = Math.random() > 0.1; // 90% success rate simulation
      
      const newStatus = mockSuccess ? 'success' : 'failed';
      
      const { error: updateError } = await supabase
        .from('payouts')
        .update({ status: newStatus })
        .eq('id', payout.id);

      if (!updateError) {
        updatedPayouts.push({
          id: payout.id,
          old_status: payout.status,
          new_status: newStatus
        });
      }
    }

    // Generate report
    const report = {
      generated_at: new Date().toISOString(),
      period: 'Last 24 hours',
      transaction_summary: {
        total_transactions: transactions?.length || 0,
        by_status: Object.entries(groupedByStatus).map(([status, txs]) => ({
          status,
          count: txs.length,
          total_amount: txs.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0)
        }))
      },
      ledger_check: {
        balanced: ledgerBalanced,
        total_debits: totalDebits,
        total_credits: totalCredits,
        difference: totalDebits - totalCredits,
        flagged_transaction_ids: flaggedTransactions
      },
      payout_updates: {
        total_checked: payouts?.length || 0,
        updated_count: updatedPayouts.length,
        details: updatedPayouts
      }
    };

    return new Response(
      JSON.stringify(report),
      { 
        status: ledgerBalanced ? 200 : 500,
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in reconciliation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
