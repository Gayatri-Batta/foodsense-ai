"use client";

import { useEffect, useState } from "react";

const STEPS = [
  {
    step: 1,
    title: "Snap a photo of your plate",
    feature: "AI Food Detection",
    description:
      "Upload a photo or take one with your camera. The AI identifies every food item on your plate and places a color-coded dot on each one.",
  },
  {
    step: 2,
    title: "See what is risky and exactly why",
    feature: "Per-Item Health Scoring",
    description:
      "Every ingredient gets its own risk rating based on your health conditions. Tap any dot to see the glycemic index, macros, and a plain-English reason.",
  },
  {
    step: 3,
    title: "Switch profiles, scores update instantly",
    feature: "Live Profile Switching",
    description:
      "Change your active health profile and every item rescores in under a second. No extra AI call, no waiting.",
  },
  {
    step: 4,
    title: "Ask follow-up questions about your meal",
    feature: "Grounded AI Chat",
    description:
      "Chat with Sage about what you just ate. Every answer is based on your actual scan, not generic nutrition advice.",
  },
];

// Step 1 — dots appear one by one over the plate
function ScanStep() {
  const [dotsVisible, setDotsVisible] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    [600, 1100, 1600, 2100].forEach((delay, i) => {
      timers.push(setTimeout(() => setDotsVisible(i + 1), delay));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const dots = [
    { top: "26%", left: "37%", bg: "#ef4444", glow: "rgba(239,68,68,0.6)", label: "White rice" },
    { top: "53%", left: "63%", bg: "#f59e0b", glow: "rgba(245,158,11,0.6)", label: "Coconut sauce" },
    { top: "44%", left: "24%", bg: "#22c55e", glow: "rgba(34,197,94,0.6)", label: "Chicken" },
    { top: "64%", left: "48%", bg: "#22c55e", glow: "rgba(34,197,94,0.6)", label: "Broccoli" },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="relative flex-1 bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center overflow-hidden">
        <div className="w-32 h-32 rounded-full bg-stone-700/40 border border-stone-600/20 flex items-center justify-center select-none">
          <span className="text-5xl">🍛</span>
        </div>

        {dots.map((d, i) => (
          <div
            key={i}
            className="absolute flex flex-col items-center gap-1 transition-all duration-500"
            style={{
              top: d.top,
              left: d.left,
              opacity: dotsVisible > i ? 1 : 0,
              transform: dotsVisible > i ? "scale(1)" : "scale(0.4)",
            }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 border-white"
              style={{ background: d.bg, boxShadow: `0 0 10px 4px ${d.glow}` }}
            />
            {dotsVisible > i && (
              <span
                className="text-[9px] text-white/70 bg-black/40 rounded px-1 py-0.5 whitespace-nowrap"
                style={{ animation: "fadeIn 0.3s ease" }}
              >
                {d.label}
              </span>
            )}
          </div>
        ))}

        <div className="absolute top-2 right-3 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1 text-[10px] text-white/70 font-medium">
          Chicken Rice Bowl
        </div>

        {dotsVisible < 4 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-white/40 animate-pulse">
            Detecting items...
          </div>
        )}
        {dotsVisible === 4 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-green-400 font-medium">
            4 items detected
          </div>
        )}
      </div>
    </div>
  );
}

// Step 2 — risk card slides up
function ScoreStep() {
  const [cardVisible, setCardVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCardVisible(true), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="h-full flex items-center justify-center px-6 bg-gradient-to-b from-stone-900 to-[#0d1710]">
      <div
        className="w-full max-w-xs bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-500"
        style={{
          opacity: cardVisible ? 1 : 0,
          transform: cardVisible ? "translateY(0)" : "translateY(24px)",
        }}
      >
        <div className="h-1.5 bg-red-500 w-full" />
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm text-gray-900">White rice</p>
            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-full px-2 py-0.5">
              HIGH RISK
            </span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Glycemic index of 72 causes rapid blood sugar spikes. Minimal fiber means glucose enters the bloodstream quickly.
          </p>
          <div className="space-y-1.5 pt-2 border-t border-gray-100">
            {[
              { label: "Glycemic Index", value: "72 (high)", color: "text-red-500" },
              { label: "Fiber per 100g", value: "0.4 g", color: "text-red-400" },
              { label: "Carbs per 100g", value: "28 g", color: "text-amber-500" },
              { label: "Matched via", value: "Vector search", color: "text-gray-400" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{row.label}</span>
                <span className={`font-medium ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-green-50 border border-green-100 px-3 py-2 text-xs text-green-700">
            Swap for cauliflower rice or brown rice to lower the glycemic impact.
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 3 — profile toggle with live rescore
function ProfileStep() {
  const [active, setActive] = useState<"diabetes" | "cholesterol">("diabetes");
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setSwitching(true);
      setTimeout(() => { setActive("cholesterol"); setSwitching(false); }, 300);
    }, 1800);
    const t2 = setTimeout(() => {
      setSwitching(true);
      setTimeout(() => { setActive("diabetes"); setSwitching(false); }, 300);
    }, 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const rows = {
    diabetes: [
      { label: "White rice", bg: "#ef4444", badge: "High Risk", tc: "text-red-400" },
      { label: "Grilled salmon", bg: "#22c55e", badge: "Safe", tc: "text-green-400" },
      { label: "Broccoli", bg: "#22c55e", badge: "Safe", tc: "text-green-400" },
    ],
    cholesterol: [
      { label: "White rice", bg: "#f59e0b", badge: "Caution", tc: "text-amber-400" },
      { label: "Grilled salmon", bg: "#f59e0b", badge: "Caution", tc: "text-amber-400" },
      { label: "Broccoli", bg: "#22c55e", badge: "Safe", tc: "text-green-400" },
    ],
  };

  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 px-6 bg-gradient-to-b from-stone-900 to-[#0d1710]">
      <div className="flex items-center bg-white/10 rounded-full p-1">
        {(["diabetes", "cholesterol"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setActive(p)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-300 ${
              active === p ? "bg-white text-[#1e3a2c] shadow-sm" : "text-white/45 hover:text-white/65"
            }`}
          >
            {p === "diabetes" ? "Type 2 Diabetes" : "High Cholesterol"}
          </button>
        ))}
      </div>

      <div
        className="w-full max-w-xs rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/8 transition-opacity duration-200"
        style={{ opacity: switching ? 0.3 : 1 }}
      >
        {rows[active].map((item) => (
          <div key={item.label} className="flex items-center justify-between px-4 py-2.5 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.bg }} />
              <span className="text-white/80 text-sm">{item.label}</span>
            </div>
            <span className={`text-xs font-bold ${item.tc}`}>{item.badge}</span>
          </div>
        ))}
      </div>

      <p className="text-white/35 text-xs text-center">Scores update in under a second, no AI call needed</p>
    </div>
  );
}

// Step 4 — chat messages appear one by one
const CHAT = [
  { role: "user", content: "Can I eat this meal again tomorrow?" },
  {
    role: "assistant",
    content:
      "The grilled chicken and broccoli are solid choices for your profile. White rice is the main concern. A smaller portion or a swap to brown rice keeps your blood sugar much more stable.",
  },
  { role: "user", content: "What about the coconut sauce?" },
  {
    role: "assistant",
    content:
      "Use a teaspoon at most. It adds saturated fat and hidden sugar that your profile flags as a concern. The flavour still comes through in a small drizzle.",
  },
];

function ChatStep() {
  const [visible, setVisible] = useState(1);

  useEffect(() => {
    if (visible >= CHAT.length) return;
    const t = setTimeout(() => setVisible((v) => v + 1), 1600);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div className="h-full flex flex-col justify-end gap-2.5 px-4 py-4 bg-gradient-to-b from-stone-900 to-[#0d1710] overflow-hidden">
      {CHAT.slice(0, visible).map((m, i) => (
        <div
          key={i}
          className={`flex ${m.role === "user" ? "justify-end" : "justify-start items-end gap-2"} animate-fade-in`}
        >
          {m.role === "assistant" && (
            <div className="w-6 h-6 rounded-full bg-[#1e3a2c] border border-white/10 flex items-center justify-center shrink-0 text-[10px]">
              🌿
            </div>
          )}
          <div
            className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
              m.role === "user" ? "bg-[#1e3a2c] text-white" : "bg-white/10 text-white/85"
            }`}
          >
            {m.content}
          </div>
        </div>
      ))}
    </div>
  );
}

// Main modal
interface Props {
  onClose: () => void;
}

export default function DemoModal({ onClose }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 7000);
    return () => clearInterval(t);
  }, []);

  const current = STEPS[step];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#111a14] rounded-2xl shadow-2xl overflow-hidden border border-white/8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">How It Works</span>
            <span className="text-[10px] font-medium text-white/40 bg-white/8 rounded-full px-2 py-0.5">
              {current.feature}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/50 hover:text-white text-base leading-none transition-colors"
            aria-label="Close"
          >
            x
          </button>
        </div>

        {/* Step number row */}
        <div className="flex border-b border-white/8">
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`flex-1 py-2 text-[10px] font-semibold transition-colors ${
                i === step
                  ? "text-white border-b-2 border-[#1e3a2c] bg-white/4"
                  : "text-white/25 hover:text-white/45"
              }`}
            >
              Step {i + 1}
            </button>
          ))}
        </div>

        {/* Animation area */}
        <div className="h-60" key={step}>
          {step === 0 && <ScanStep />}
          {step === 1 && <ScoreStep />}
          {step === 2 && <ProfileStep />}
          {step === 3 && <ChatStep />}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/8">
          <p className="text-white text-sm font-semibold">{current.title}</p>
          <p className="text-white/45 text-xs mt-1 leading-relaxed">{current.description}</p>

          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === step ? "w-6 bg-[#1e3a2c]" : "w-2 bg-white/20 hover:bg-white/35"
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep((step - 1 + STEPS.length) % STEPS.length)}
                className="text-white/40 hover:text-white/70 text-xs transition-colors px-1"
              >
                Prev
              </button>
              <button
                onClick={() => setStep((step + 1) % STEPS.length)}
                className="text-white/40 hover:text-white/70 text-xs transition-colors px-1"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
