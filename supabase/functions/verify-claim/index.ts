import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://esm.sh/jose@4.15.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
      }
    );

    const { claim_id, verification_method, evidence } = await req.json();

    if (!claim_id || !verification_method) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: claim_id, verification_method" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch claim with related data
    const { data: claim, error: claimError } = await supabaseClient
      .from("drop_claims")
      .select(`
        id,
        user_id,
        status,
        drop_id,
        drops (
          campaign_id,
          code,
          creator_id,
          campaigns (
            merchant_id,
            min_purchase,
            cashback_amount
          )
        )
      `)
      .eq("id", claim_id)
      .single();

    if (claimError || !claim) {
      return new Response(
        JSON.stringify({ error: "Claim not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (claim.status !== "claimed") {
      return new Response(
        JSON.stringify({ error: "Claim already verified or invalid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const drop = claim.drops;
    const campaign = drop.campaigns;
    const merchantId = campaign.merchant_id;
    const minPurchase = campaign.min_purchase;

    // Fetch merchant details
    const { data: merchant } = await supabaseClient
      .from("merchants")
      .select("id, name, upi_id, latitude, longitude")
      .eq("id", merchantId)
      .single();

    // Fetch user location
    const { data: user } = await supabaseClient
      .from("users")
      .select("latitude, longitude")
      .eq("id", claim.user_id)
      .single();

    let qrValid = false;
    let receiptValid = false;
    let upiValid = false;
    let gpsMatch = false;
    let invoiceHash: string | null = null;
    let deviceVelocityFail = false;

    // Verification Logic
    if (verification_method === "qr_scan") {
      const qrSecret = Deno.env.get("QR_SECRET");
      if (!qrSecret || !evidence.qr_token) {
        return new Response(
          JSON.stringify({ error: "Missing QR secret or token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const secret = new TextEncoder().encode(qrSecret);
        const { payload } = await jwtVerify(evidence.qr_token, secret);
        
        // Check expiration and IDs match
        const now = Math.floor(Date.now() / 1000);
        if ((payload.exp as number) < now) {
          qrValid = false;
        } else if (payload.claim_id !== claim_id || payload.drop_id !== claim.drop_id) {
          qrValid = false;
        } else {
          qrValid = true;
        }
      } catch (e) {
        qrValid = false;
      }
    } else if (verification_method === "receipt_ocr") {
      if (!evidence.receipt_image_url) {
        return new Response(
          JSON.stringify({ error: "Missing receipt image URL" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const visionApiKey = Deno.env.get("GOOGLE_VISION_API_KEY");
      if (visionApiKey) {
        try {
          const visionRes = await fetch(
            `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                requests: [{
                  image: { source: { imageUri: evidence.receipt_image_url } },
                  features: [{ type: "TEXT_DETECTION", maxResults: 1 }]
                }]
              })
            }
          );
          const visionData = await visionRes.json();
          const text = visionData.responses?.[0]?.fullTextAnnotation?.text || "";
          
          // Simple extraction logic (in production, use more robust parsing)
          const amountMatch = text.match(/\d+(\.\d{2})?/);
          const extractedAmount = amountMatch ? parseFloat(amountMatch[0]) : 0;
          
          // Compute hash for dedup
          const encoder = new TextEncoder();
          const data = encoder.encode(text);
          const hashBuffer = await crypto.subtle.digest("SHA-256", data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          invoiceHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

          receiptValid = extractedAmount >= (minPurchase || 0);
        } catch (e) {
          receiptValid = false;
        }
      }
    } else if (verification_method === "upi_match") {
      if (!evidence.upi_txn_id || !evidence.amount) {
        return new Response(
          JSON.stringify({ error: "Missing UPI transaction ID or amount" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const upiPattern = /^[0-9a-zA-Z.-]+@[a-zA-Z]+$/;
      const isValidPattern = upiPattern.test(evidence.upi_txn_id);
      const amountMatch = parseFloat(evidence.amount) >= (minPurchase || 0);
      
      // In a real scenario, you'd verify the merchant UPI ID against a bank API
      // Here we assume if pattern and amount match, it's valid
      upiValid = isValidPattern && amountMatch;
    }

    // Risk Scoring
    // 1. GPS Proximity
    if (user?.latitude && user?.longitude && merchant?.latitude && merchant?.longitude) {
      const R = 6371e3; // Earth radius in meters
      const φ1 = user.latitude * Math.PI / 180;
      const φ2 = merchant.latitude * Math.PI / 180;
      const Δφ = (merchant.latitude - user.latitude) * Math.PI / 180;
      const Δλ = (merchant.longitude - user.longitude) * Math.PI / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      gpsMatch = distance < 500;
    }

    // 2. Device Velocity (claims in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentClaims } = await supabaseClient
      .from("drop_claims")
      .select("*", { count: "exact", head: true })
      .eq("user_id", claim.user_id)
      .gt("claimed_at", oneHourAgo);

    deviceVelocityFail = (recentClaims || 0) > 3;

    // 3. Invoice Dedup
    let invoiceDedupFail = false;
    if (invoiceHash) {
      const { data: existingRisk } = await supabaseClient
        .from("risk_scores")
        .select("id")
        .eq("invoice_hash", invoiceHash)
        .single();
      
      if (existingRisk) {
        invoiceDedupFail = true;
      }
    }

    // Calculate Score
    let totalScore = 0;
    if (verification_method === "qr_scan" && qrValid) totalScore += 40;
    if (verification_method === "receipt_ocr" && receiptValid) totalScore += 40;
    if (verification_method === "upi_match" && upiValid) totalScore += 40;
    
    if (gpsMatch) totalScore += 30;
    if (!deviceVelocityFail) totalScore += 20;
    if (!invoiceDedupFail) totalScore += 10;

    // Cap at 100
    totalScore = Math.min(totalScore, 100);

    const verdict = totalScore > 80 ? "approved" : "review";

    // Insert Risk Score
    const { data: riskRecord, error: riskError } = await supabaseClient
      .from("risk_scores")
      .insert({
        claim_id: claim_id,
        gps_match: gpsMatch,
        device_velocity: recentClaims || 0,
        invoice_hash: invoiceHash,
        upi_match: upiValid,
        total_score: totalScore,
        verdict: verdict
      })
      .select()
      .single();

    if (riskError) {
      console.error("Error inserting risk score:", riskError);
    }

    // If approved, settle transaction
    if (verdict === "approved") {
      // Update claim status
      await supabaseClient
        .from("drop_claims")
        .update({ 
          status: "verified", 
          verified_at: new Date().toISOString() 
        })
        .eq("id", claim_id);

      // Create transaction record
      const cashback = campaign.cashback_amount || 0;
      const platformFee = cashback * 0.1; // 10% platform fee
      const creatorShare = cashback * 0.1; // 10% to creator
      const merchantDebit = cashback + platformFee;
      const userCredit = cashback;
      const creatorCredit = creatorShare;

      const { data: txnData } = await supabaseClient
        .from("transactions")
        .insert({
          claim_id: claim_id,
          amount: cashback,
          merchant_debit: merchantDebit,
          user_credit: userCredit,
          creator_credit: creatorCredit,
          platform_revenue: platformFee,
          status: "completed"
        })
        .select()
        .single();
      
      // Trigger payout for creator
      if (txnData && drop.creator_id) {
        await supabaseClient
          .from("payouts")
          .insert({
            transaction_id: txnData.id,
            recipient_type: "creator",
            recipient_id: drop.creator_id,
            amount: creatorCredit,
            status: "pending"
          });
      }
    }

    return new Response(
      JSON.stringify({ verdict, total_score: totalScore, risk_score_id: riskRecord?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error verifying claim:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
