"use client";

import { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle, XCircle, RefreshCw, Loader2 } from "lucide-react";

type ScanState = "scanning" | "loading" | "success" | "error";

interface SuccessData {
  amount: number;
  merchant: string;
}

export default function MerchantScannerPage() {
  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [supabaseClient, setSupabaseClient] = useState<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    // Initialize Supabase only on the client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
    setSupabaseClient(createClient(supabaseUrl, supabaseKey));
  }, []);

  useEffect(() => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode("qr-reader");
    }

    const startScanning = async () => {
      try {
        if (scannerRef.current?.isScanning) {
           return;
        }
        await scannerRef.current?.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          async (decodedText) => {
            handleScan(decodedText);
          },
          () => {} // Ignore scan errors (normal operation)
        );
      } catch (err) {
        console.error("Failed to start scanner:", err);
      }
    };

    if (scanState === "scanning") {
        startScanning();
    } else {
        if (scannerRef.current?.isScanning) {
             scannerRef.current.pause();
        }
    }

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [scanState]);

  // Need to handle component unmount specifically
  useEffect(() => {
      return () => {
          if (scannerRef.current?.isScanning) {
             scannerRef.current.stop().catch(console.error);
          }
      };
  }, []);

  const handleScan = async (text: string) => {
    try {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.pause();
      }
      setScanState("loading");

      const payload = JSON.parse(text);
      if (!payload.drop_id) {
        throw new Error("Invalid QR code format: missing drop_id");
      }

      if (!supabaseClient) {
          throw new Error("Supabase client not initialized");
      }

      // @ts-ignore: bypass strict checking for RPC arguments
      const { data, error } = await supabaseClient.rpc("redeem_drop_claim", {
        p_drop_id: payload.drop_id,
      });

      if (error) throw error;

      const responseData = data as any;

      // Assuming RPC returns an object with amount and merchant
      // Adapt this to match the actual RPC response format
      setSuccessData({
        amount: responseData?.amount || 0,
        merchant: responseData?.merchant || "Unknown Merchant",
      });
      setScanState("success");
    } catch (err: any) {
      console.error("Scan error:", err);
      setErrorMessage(err.message || "Failed to process QR code");
      setScanState("error");
    }
  };

  const resetScanner = () => {
    setScanState("scanning");
    setSuccessData(null);
    setErrorMessage("");
    if (scannerRef.current?.isScanning) {
       scannerRef.current.resume();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-700">
        <div className="p-6 text-center border-b border-gray-700">
          <h1 className="text-2xl font-bold">Merchant Scanner</h1>
          <p className="text-gray-400 text-sm mt-1">Scan customer QR codes</p>
        </div>

        <div className="p-6">
          <div
             className={`w-full mx-auto overflow-hidden rounded-xl bg-black ${scanState !== 'scanning' ? 'hidden' : ''}`}
             id="qr-reader"
          ></div>

          {scanState === "loading" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-300">Processing claim...</p>
            </div>
          )}

          {scanState === "success" && successData && (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-green-400 mb-2">Claim Successful!</h2>
              <div className="bg-gray-700 rounded-lg p-4 w-full mt-4 space-y-3">
                <div className="flex justify-between items-center border-b border-gray-600 pb-2">
                  <span className="text-gray-400">Cashback Amount</span>
                  <span className="text-xl font-bold text-white">₹{successData.amount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Merchant</span>
                  <span className="font-medium text-white">{successData.merchant}</span>
                </div>
              </div>
              <button
                onClick={resetScanner}
                className="mt-8 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Scan Another
              </button>
            </div>
          )}

          {scanState === "error" && (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <XCircle className="w-16 h-16 text-red-500 mb-4" />
              <h2 className="text-xl font-bold text-red-400 mb-2">Verification Failed</h2>
              <p className="text-gray-300 mb-8">{errorMessage}</p>
              <button
                onClick={resetScanner}
                className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
