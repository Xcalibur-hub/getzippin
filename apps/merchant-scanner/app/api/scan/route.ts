import { NextRequest, NextResponse } from "next/server";

// Mock database client - replace with actual Supabase client in production
// import { createClient } from '@supabase/supabase-js'

interface ScanRequestBody {
  merchant_id: string;
  qr_token: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ScanRequestBody = await request.json();
    const { merchant_id, qr_token } = body;

    // Validate input
    if (!merchant_id || !qr_token) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // In production, verify the JWT token and call Supabase Edge Function
    // For now, mock the verification process
    
    // Mock: Decode JWT (in production, use proper JWT verification)
    let tokenData: any;
    try {
      // Simple base64 decode for demo - use proper JWT lib in production
      const parts = qr_token.split('.');
      if (parts.length === 3) {
        const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
        tokenData = JSON.parse(payload);
      } else {
        throw new Error("Invalid token format");
      }
    } catch (e) {
      return NextResponse.json(
        { success: false, message: "Invalid QR token format" },
        { status: 400 }
      );
    }

    // Check token expiration
    if (tokenData.exp && Date.now() > tokenData.exp * 1000) {
      return NextResponse.json(
        { success: false, message: "QR code has expired" },
        { status: 400 }
      );
    }

    // In production, call Supabase Edge Function to verify claim
    // const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/verify-claim`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     claim_id: tokenData.claim_id,
    //     verification_method: 'qr_scan',
    //     evidence: { qr_token, merchant_id }
    //   })
    // });

    // Mock successful verification response
    return NextResponse.json({
      success: true,
      message: "Claim verified successfully",
      data: {
        claim_id: tokenData.claim_id || "mock-claim-id",
        amount: 40,
        user_name: "John Doe"
      }
    });

  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "Verification failed" 
      },
      { status: 500 }
    );
  }
}
