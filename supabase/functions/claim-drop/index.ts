import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { create } from "https://deno.land/x/djwt@v2.9/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { drop_id, user_id } = await req.json();

    // Validate required fields
    if (!drop_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: drop_id and user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: Check if user has max 5 active claims
    const { data: activeClaims, error: claimsError } = await supabaseClient
      .from("drop_claims")
      .select("id, status, expires_at")
      .eq("user_id", user_id)
      .in("status", ["claimed", "verified"])
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (claimsError) {
      console.error("Error checking active claims:", claimsError);
      return new Response(
        JSON.stringify({ error: "Failed to check active claims" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const activeClaimCount = activeClaims?.length ?? 0;
    if (activeClaimCount >= 5) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded: Maximum 5 active claims per user" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch drop with campaign details
    const { data: drop, error: dropError } = await supabaseClient
      .from("drops")
      .select(`
        id,
        code,
        expires_at,
        campaigns (
          id,
          status,
          start_date,
          end_date
        )
      `)
      .eq("id", drop_id)
      .single();

    if (dropError || !drop) {
      console.error("Error fetching drop:", dropError);
      return new Response(
        JSON.stringify({ error: "Drop not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if drop is expired
    const now = new Date();
    if (drop.expires_at && new Date(drop.expires_at) < now) {
      return new Response(
        JSON.stringify({ error: "Drop has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if campaign is active
    const campaign = drop.campaigns;
    if (!campaign) {
      return new Response(
        JSON.stringify({ error: "Campaign not found for this drop" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (campaign.status !== "active") {
      return new Response(
        JSON.stringify({ error: "Campaign is not active" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check campaign dates
    if (campaign.start_date && new Date(campaign.start_date) > now) {
      return new Response(
        JSON.stringify({ error: "Campaign has not started yet" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (campaign.end_date && new Date(campaign.end_date) < now) {
      return new Response(
        JSON.stringify({ error: "Campaign has ended" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has already claimed this drop
    const { data: existingClaim, error: existingClaimError } = await supabaseClient
      .from("drop_claims")
      .select("id")
      .eq("drop_id", drop_id)
      .eq("user_id", user_id)
      .in("status", ["claimed", "verified"])
      .single();

    if (existingClaimError && existingClaimError.code !== "PGRST116") {
      // PGRST116 means no rows returned, which is what we want
      console.error("Error checking existing claim:", existingClaimError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing claims" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingClaim) {
      return new Response(
        JSON.stringify({ error: "User has already claimed this drop" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate expiration time (15 minutes from now)
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    // Insert drop_claim
    const { data: newClaim, error: claimInsertError } = await supabaseClient
      .from("drop_claims")
      .insert({
        drop_id,
        user_id,
        status: "claimed",
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (claimInsertError) {
      console.error("Error inserting drop_claim:", claimInsertError);
      return new Response(
        JSON.stringify({ error: "Failed to create claim" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claim_id = newClaim.id;

    // Generate JWT QR token
    const qrSecret = Deno.env.get("QR_SECRET");
    if (!qrSecret) {
      console.error("QR_SECRET environment variable not set");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    const keyData = encoder.encode(qrSecret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const qrToken = await create(
      { alg: "HS256", typ: "JWT" },
      {
        claim_id,
        user_id,
        drop_id,
        exp: Math.floor(expiresAt.getTime() / 1000),
      },
      key
    );

    // Update the drop_claim with the QR token
    const { error: updateError } = await supabaseClient
      .from("drop_claims")
      .update({ qr_token: qrToken })
      .eq("id", claim_id);

    if (updateError) {
      console.error("Error updating drop_claim with QR token:", updateError);
      // Continue anyway, as we have the token
    }

    // Create team_slash record
    const { data: teamSlash, error: teamSlashError } = await supabaseClient
      .from("team_slashes")
      .insert({
        drop_id,
        inviter_user_id: user_id,
        invitee_count: 0,
        bonus_multiplier: 1,
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (teamSlashError) {
      console.error("Error creating team_slash:", teamSlashError);
      return new Response(
        JSON.stringify({ error: "Failed to create team slash" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        qr_token: qrToken,
        team_slash_id: teamSlash.id,
        claim_id,
        expires_at: expiresAt.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
