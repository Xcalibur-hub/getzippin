"use client";

import { useEffect, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { motion, AnimatePresence } from "framer-motion";

interface QRScannerProps {
  onScanSuccess: (token: string) => void;
  onError?: (error: string) => void;
}

export default function QRScanner({ onScanSuccess, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);

  useEffect(() => {
    let scanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode("qr-reader");
        const devices = await Html5Qrcode.getCameras();
        
        if (devices && devices.length) {
          // Use back camera if available
          const backCamera = devices.find(d => d.label.toLowerCase().includes("back")) || devices[0];
          
          await scanner.start(
            backCamera.id,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              onScanSuccess(decodedText);
              scanner?.stop().catch(console.error);
              setIsScanning(false);
            },
            (errorMessage) => {
              // Ignore scanning errors (normal operation)
            }
          );
          setIsScanning(true);
          setCameraPermission(true);
        } else {
          throw new Error("No cameras found");
        }
      } catch (err) {
        console.error("Camera error:", err);
        setCameraPermission(false);
        if (onError) {
          onError(err instanceof Error ? err.message : "Camera access denied");
        }
      }
    };

    startScanner();

    return () => {
      if (scanner && isScanning) {
        scanner.stop().catch(console.error);
      }
    };
  }, [onScanSuccess, onError, isScanning]);

  const restartScanner = () => {
    setIsScanning(false);
    setTimeout(() => setIsScanning(true), 100);
  };

  if (cameraPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-lg">
        <svg className="w-12 h-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-red-700 font-medium mb-2">Camera access required</p>
        <p className="text-red-600 text-sm text-center mb-4">Please enable camera permissions to scan QR codes</p>
        <button
          onClick={restartScanner}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div id="qr-reader" className="rounded-lg overflow-hidden shadow-lg" />
      {!isScanning && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <p className="text-white font-medium">Starting camera...</p>
        </div>
      )}
    </div>
  );
}
