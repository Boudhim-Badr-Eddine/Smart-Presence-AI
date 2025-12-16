'use client';
import Webcam from 'react-webcam';
import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';

export default function WebcamEnrollment({
  onCaptured,
}: {
  onCaptured: (images: string[]) => void;
}) {
  const webcamRef = useRef<Webcam>(null);
  const [shots, setShots] = useState<string[]>([]);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      const next = [...shots, imageSrc];
      setShots(next.slice(0, 3));
    }
  }, [shots]);

  const reset = () => setShots([]);

  const submit = () => {
    if (shots.length < 3) return;
    onCaptured(shots);
  };

  return (
    <div className="space-y-3">
      <div className="rounded border border-zinc-800 bg-zinc-900 p-3">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          className="h-60 w-full rounded"
        />
      </div>
      <div className="flex gap-2">
        <button onClick={capture} className="rounded bg-amber-600 px-3 py-2 text-sm text-white">
          Capturer
        </button>
        <button onClick={reset} className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-200">
          Réinitialiser
        </button>
        <button
          onClick={submit}
          disabled={shots.length < 3}
          className="rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-60"
        >
          Enregistrer (3 photos)
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {shots.map((s, i) => (
          <div key={i} className="relative h-24 w-full rounded overflow-hidden">
            <Image src={s} alt={`capture-${i}`} fill className="object-cover" loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}
