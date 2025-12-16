'use client';
import { motion } from 'framer-motion';
import { Camera, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useState, useRef } from 'react';

interface ProfileAvatarProps {
  currentAvatar?: string;
  onUpdate: (imageBase64: string) => void;
}

export default function ProfileAvatar({ currentAvatar, onUpdate }: ProfileAvatarProps) {
  const [preview, setPreview] = useState<string | undefined>(currentAvatar);
  const [showWebcam, setShowWebcam] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowWebcam(true);
    } catch (err) {
      console.error('Webcam access error:', err);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPreview(dataUrl);
      onUpdate(dataUrl);
      stopWebcam();
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowWebcam(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreview(result);
        onUpdate(result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-4">
        <div className="h-24 w-24 rounded-full border-2 border-zinc-700 bg-zinc-800 overflow-hidden relative">
          {preview ? (
            <Image src={preview} alt="Avatar" fill className="object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-500">
              <Camera className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <button
            onClick={startWebcam}
            className="flex items-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500"
          >
            <Camera className="h-4 w-4" />
            Prendre Photo
          </button>
          <label className="flex items-center gap-2 rounded border border-zinc-700 px-3 py-2 text-sm cursor-pointer hover:bg-zinc-800">
            <Upload className="h-4 w-4" />
            Télécharger
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {showWebcam && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3 rounded border border-zinc-700 bg-zinc-900 p-4"
        >
          <video ref={videoRef} autoPlay className="w-full rounded" />
          <div className="flex gap-2">
            <button
              onClick={capturePhoto}
              className="flex-1 rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500"
            >
              Capturer
            </button>
            <button
              onClick={stopWebcam}
              className="rounded border border-zinc-700 px-4 py-2 hover:bg-zinc-800"
            >
              Annuler
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
