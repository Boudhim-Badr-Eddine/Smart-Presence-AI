'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, Check } from 'lucide-react';
import jsQR from 'jsqr';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
        }
      } catch (err) {
        setError('Camera access denied. Please enable camera permissions.');
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const videoEl = videoRef.current;
    const canvasEl = canvasRef.current;
    const interval = setInterval(() => {
      if (videoEl && canvasEl && !scanned) {
        const ctx = canvasEl.getContext('2d');

        if (ctx && videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
          canvasEl.width = videoEl.videoWidth;
          canvasEl.height = videoEl.videoHeight;

          ctx.drawImage(videoEl, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code) {
            setScanned(true);
            onScan(code.data);
            setTimeout(onClose, 1500);
          }
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [scanned, onScan, onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card rounded-lg shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-dark-text flex items-center gap-2">
            <Camera className="w-5 h-5" />
            QR Code Scanner
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-dark-bg rounded">
            <X className="w-5 h-5 text-dark-muted" />
          </button>
        </div>

        {error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
            {error}
          </div>
        ) : (
          <>
            <div className="relative rounded-lg overflow-hidden bg-white/5 mb-4">
              <video ref={videoRef} autoPlay playsInline className="w-full" />
              <canvas ref={canvasRef} className="hidden" />
              {scanned && (
                <div className="absolute inset-0 bg-emerald-500/20 border-4 border-emerald-500 flex items-center justify-center">
                  <Check className="w-12 h-12 text-emerald-400" />
                </div>
              )}
            </div>

            <p className="text-sm text-dark-muted text-center">
              {scanned
                ? '✓ QR Code scanned successfully!'
                : 'Point your camera at a QR code to scan'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
