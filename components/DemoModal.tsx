"use client";

// Paste your YouTube or Loom embed URL here when you have the demo video ready.
// YouTube embed: https://www.youtube.com/embed/YOUR_VIDEO_ID
// Loom embed:    https://www.loom.com/embed/YOUR_VIDEO_ID
const DEMO_VIDEO_URL = "";

const HIGHLIGHTS = [
  {
    icon: "📸",
    title: "Scan any meal",
    description:
      "Take or upload a photo of your plate. The AI detects every visible food item and marks it on the image.",
  },
  {
    icon: "🎯",
    title: "Personalized risk scoring",
    description:
      "Each detected item gets a color — safe, limit, or avoid — based on your health conditions.",
  },
  {
    icon: "⚡",
    title: "Instant profile switching",
    description:
      "Change your active health profile and every item rescores live without an extra AI call.",
  },
  {
    icon: "💬",
    title: "Follow-up chat",
    description:
      "Ask Sage anything about your scan. Answers are grounded in your actual results, not generic advice.",
  },
  {
    icon: "🥗",
    title: "Pantry scan",
    description:
      "Photograph your fridge or pantry and get recipe ideas filtered for your health conditions.",
  },
  {
    icon: "📊",
    title: "Health dashboard",
    description:
      "Track your eating patterns over time and see which conditions are most frequently triggered.",
  },
];

interface Props {
  onClose: () => void;
}

export default function DemoModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
          <p className="font-semibold text-foreground">See FoodSense AI in action</p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 text-xl leading-none transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {DEMO_VIDEO_URL ? (
          /* Embedded video player */
          <div className="aspect-video bg-black">
            <iframe
              src={DEMO_VIDEO_URL}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="FoodSense AI demo"
            />
          </div>
        ) : (
          /* Feature highlights shown until a real video is ready */
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-500">
              Here is what you can do with FoodSense AI.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HIGHLIGHTS.map((h) => (
                <div
                  key={h.title}
                  className="flex gap-3 p-3.5 rounded-xl bg-background border border-black/5"
                >
                  <span className="text-2xl shrink-0 leading-none mt-0.5">{h.icon}</span>
                  <div>
                    <p className="font-medium text-sm text-foreground">{h.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      {h.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 pt-1">
              Video walkthrough coming soon. Create an account to try it yourself.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
