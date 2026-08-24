"use client";

import { useState, useCallback } from "react";
import QRScanner from "@/components/QRScanner";
import { motion, AnimatePresence } from "framer-motion";

interface ScanResult {
  success: boolean;
  message?: string;
  data?: {
    claim_id: string;
    amount: number;
    user_name?: string;
  };
}

export default function Home() {
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "processing" | "success" | "error">("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Mock merchant ID - in real app, this would come from auth context
  const MERCHANT_ID = "current-merchant-id";

  const handleScanSuccess = useCallback(async (token: string) => {
    setScanStatus("processing");
    setResult(null);
    setErrorMessage("");

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchant_id: MERCHANT_ID,
          qr_token: token,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);
        setScanStatus("success");
        
        // Auto-reset after 3 seconds for next scan
        setTimeout(() => {
          setScanStatus("idle");
          setResult(null);
        }, 3000);
      } else {
        throw new Error(data.message || "Verification failed");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred";
      setErrorMessage(errorMsg);
      setScanStatus("error");
      
      // Auto-reset after 2 seconds for retry
      setTimeout(() => {
        setScanStatus("idle");
        setErrorMessage("");
      }, 2000);
    }
  }, [MERCHANT_ID]);

  const handleError = useCallback((error: string) => {
    setErrorMessage(error);
    setScanStatus("error");
  }, []);

  const startScanning = () => {
    setScanStatus("scanning");
    setResult(null);
    setErrorMessage("");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Merchant Scanner</h1>
          <p className="text-gray-600 text-sm">Scan customer QR codes to verify claims</p>
        </motion.div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {scanStatus === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-8 text-center"
            >
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h.01M12 20h.01M12 8h.01M18 12h.01M6 12h.01M6 8h.01M6 16h.01M18 8h.01M18 16h.01M12 16h.01M4.5 12a7.5 7.5 0 0015 0 7.5 7.5 0 00-15 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Ready to Scan</h2>
              <p className="text-gray-600 mb-6">Point your camera at the customer&apos;s QR code</p>
              <button
                onClick={startScanning}
                className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-98 transition-all shadow-lg shadow-blue-600/30"
              >
                Start Scanning
              </button>
            </motion.div>
          )}

          {(scanStatus === "scanning" || scanStatus === "processing") && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6"
            >
              <div className="text-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {scanStatus === "scanning" ? "Position QR Code" : "Verifying..."}
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {scanStatus === "scanning" ? "Frame the code within the scanner" : "Please wait while we verify the claim"}
                </p>
              </div>
              
              {scanStatus === "scanning" && (
                <QRScanner onScanSuccess={handleScanSuccess} onError={handleError} />
              )}

              {scanStatus === "processing" && (
                <div className="flex flex-col items-center justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
                  />
                  <p className="mt-4 text-gray-600">Processing verification...</p>
                </div>
              )}
            </motion.div>
          )}

          {scanStatus === "success" && result && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-green-50 rounded-2xl shadow-xl p-8 text-center border-2 border-green-200"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <h2 className="text-2xl font-bold text-green-800 mb-2">Verified!</h2>
              <p className="text-green-700 mb-4">{result.message || "Claim verified successfully"}</p>
              
              {result.data && (
                <div className="bg-white rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold text-gray-900">₹{result.data.amount}</span>
                  </div>
                  {result.data.user_name && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Customer:</span>
                      <span className="font-semibold text-gray-900">{result.data.user_name}</span>
                    </div>
                  )}
                </div>
              )}
              
              <p className="text-green-600 text-sm mt-4">Scanner will reset automatically...</p>
            </motion.div>
          )}

          {scanStatus === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-red-50 rounded-2xl shadow-xl p-8 text-center border-2 border-red-200"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.div>
              <h2 className="text-xl font-bold text-red-800 mb-2">Verification Failed</h2>
              <p className="text-red-700">{errorMessage}</p>
              <p className="text-red-600 text-sm mt-4">Retrying automatically...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-gray-500 text-xs mt-8"
        >
          Merchant ID: {MERCHANT_ID}
        </motion.p>
      </div>
    </main>
  );
}
