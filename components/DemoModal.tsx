"use client";

// Set this to your YouTube embed URL or Loom embed URL to activate the video.
// YouTube: https://www.youtube.com/embed/YOUR_VIDEO_ID?autoplay=1
// Loom:    https://www.loom.com/embed/YOUR_VIDEO_ID?autoplay=1
const DEMO_VIDEO_URL = "";

interface Props {
  onClose: () => void;
}

export default function DemoModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-black rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <div className="flex items-center justify-between px-5 py-3">
          <p className="text-sm font-medium text-white/70">FoodSense AI — Demo</p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white text-lg leading-none transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Video area */}
        <div className="aspect-video w-full bg-gray-950 relative">
          {DEMO_VIDEO_URL ? (
            <iframe
              src={DEMO_VIDEO_URL}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="FoodSense AI demo"
            />
          ) : (
            /* Cinematic placeholder — replace DEMO_VIDEO_URL above to activate */
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  background:
                    "radial-gradient(ellipse at 30% 50%, #1e3a2c 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, #0f2118 0%, transparent 60%)",
                }}
              />
              <div className="relative flex flex-col items-center gap-4 text-center">
                <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="white"
                    className="ml-1.5"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white text-lg font-semibold tracking-tight">FoodSense AI</p>
                  <p className="text-white/40 text-sm mt-1">
                    Paste your video URL into DEMO_VIDEO_URL in DemoModal.tsx
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
