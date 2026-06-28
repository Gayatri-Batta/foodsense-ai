"use client";

import { useEffect, useRef, useState } from "react";

// Desktop browsers ignore <input capture> and just reopen the file browser,
// so on non-touch devices we drive the laptop/webcam directly via
// getUserMedia instead, with our own shutter button and a live preview.
export default function CameraCaptureModal({
  onCapture,
  onClose,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError("Couldn't access your camera. Check your browser's camera permission and try again."));

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="relative bg-black aspect-[4/3] flex items-center justify-center">
          {error ? (
            <p className="text-white text-sm text-center px-6">{error}</p>
          ) : (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex items-center justify-between p-4">
          <button onClick={onClose} className="text-sm font-medium text-gray-500 hover:text-gray-700 px-3 py-2">
            Cancel
          </button>
          {!error && (
            <button
              onClick={capture}
              aria-label="Capture photo"
              className="w-14 h-14 rounded-full border-4 border-brand bg-white hover:bg-brand-light transition-colors"
            />
          )}
          <span className="w-16" />
        </div>
      </div>
    </div>
  );
}
