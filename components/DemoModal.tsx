"use client";

import { useEffect, useState } from "react";

const SLIDES = [
  {
    title: "Scan any meal",
    description: "Upload or photograph a plate. AI detects every item and places a color-coded dot on each one.",
  },
  {
    title: "Understand exactly why",
    description: "Tap any dot to see the risk reasoning, glycemic index, macros, and what to swap instead.",
  },
  {
    title: "Switch profiles, scores update live",
    description: "Change your active health profile and every item rescores instantly — no extra AI call.",
  },
  {
    title: "Ask follow-up questions",
    description: "Chat with Sage about your scan. Answers are grounded in what you actually ate.",
  },
];

// --- Slide 1: scan result with dot overlay ---
function ScanSlide() {
  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="relative flex-1 bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center overflow-hidden">
        <div className="w-36 h-36 rounded-full bg-stone-700/40 border border-stone-600/20 flex items-center justify-center select-none">
          <span className="text-5xl">🍛</span>
        </div>
        {[
          { top: "26%", left: "37%", bg: "#ef4444", glow: "rgba(239,68,68,0.55)" },
          { top: "53%", left: "63%", bg: "#f59e0b", glow: "rgba(245,158,11,0.55)" },
          { top: "44%", left: "24%", bg: "#22c55e", glow: "rgba(34,197,94,0.55)" },
          { top: "64%", left: "48%", bg: "#22c55e", glow: "rgba(34,197,94,0.55)" },
        ].map((d, i) => (
          <div
            key={i}
            className="absolute w-4 h-4 rounded-full border-2 border-white"
            style={{ top: d.top, left: d.left, background: d.bg, boxShadow: `0 0 10px 3px ${d.glow}` }}
          />
        ))}
        <div className="absolute top-2 right-3 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1 text-[10px] text-white/70 font-medium">
          Chicken Rice Bowl
        </div>
      </div>
      <div className="bg-[#0d1710] border-t border-white/8 px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2">
        {[
          { bg: "#ef4444", label: "White rice", badge: "High Risk", tc: "text-red-400" },
          { bg: "#22c55e", label: "Grilled chicken", badge: "Safe", tc: "text-green-400" },
          { bg: "#f59e0b", label: "Coconut sauce", badge: "Caution", tc: "text-amber-400" },
          { bg: "#22c55e", label: "Broccoli", badge: "Safe", tc: "text-green-400" },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.bg }} />
              <span className="text-white/70 text-xs truncate">{item.label}</span>
            </div>
            <span className={`text-[10px] font-bold ml-1 shrink-0 ${item.tc}`}>{item.badge}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Slide 2: risk detail tooltip ---
function RiskSlide() {
  return (
    <div className="h-full flex items-center justify-center px-6 animate-fade-in bg-gradient-to-b from-stone-900 to-[#0d1710]">
      <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl overflow-hidden">
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
              { label: "Glycemic Index", value: "72 — high", color: "text-red-500" },
              { label: "Fiber per 100g", value: "0.4 g", color: "text-red-400" },
              { label: "Carbs per 100g", value: "28 g", color: "text-amber-500" },
              { label: "Match method", value: "Vector match", color: "text-gray-400" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{row.label}</span>
                <span className={`font-medium ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 pt-1 border-t border-gray-100">
            Swap for cauliflower rice or brown rice to lower the glycemic impact.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Slide 3: profile switch with live rescore ---
function ProfileSlide() {
  const [active, setActive] = useState<"diabetes" | "cholesterol">("diabetes");

  useEffect(() => {
    const t1 = setTimeout(() => setActive("cholesterol"), 1600);
    const t2 = setTimeout(() => setActive("diabetes"), 4000);
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
    <div className="h-full flex flex-col items-center justify-center gap-4 px-6 animate-fade-in bg-gradient-to-b from-stone-900 to-[#0d1710]">
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

      <div className="w-full max-w-xs rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/8">
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

      <p className="text-white/35 text-xs text-center">Rescores happen in under a second, no AI call</p>
    </div>
  );
}

// --- Slide 4: chat conversation ---
const CHAT_MESSAGES = [
  { role: "user", content: "Can I eat this meal again tomorrow?" },
  {
    role: "assistant",
    content:
      "The grilled chicken and broccoli are solid choices for your profile. White rice is the main concern — a smaller portion or a swap to brown rice keeps your blood sugar much more stable.",
  },
  { role: "user", content: "What about the coconut sauce?" },
  {
    role: "assistant",
    content:
      "Skip it or use a teaspoon at most. It adds saturated fat and hidden sugar that your profile flags as a concern. The flavour still comes through in a small drizzle.",
  },
];

function ChatSlide() {
  const [visible, setVisible] = useState(1);

  useEffect(() => {
    if (visible >= CHAT_MESSAGES.length) return;
    const t = setTimeout(() => setVisible((v) => v + 1), 1500);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div className="h-full flex flex-col justify-end gap-2.5 px-4 py-4 bg-gradient-to-b from-stone-900 to-[#0d1710] animate-fade-in overflow-hidden">
      {CHAT_MESSAGES.slice(0, visible).map((m, i) => (
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
              m.role === "user"
                ? "bg-[#1e3a2c] text-white"
                : "bg-white/10 text-white/85"
            }`}
          >
            {m.content}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Main modal ---
interface Props {
  onClose: () => void;
}

export default function DemoModal({ onClose }: Props) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 7000);
    return () => clearInterval(t);
  }, []);

  function goTo(n: number) {
    setSlide(n);
  }

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
            <span className="text-sm font-semibold text-white">FoodSense AI</span>
            <span className="text-[10px] font-medium text-white/40 bg-white/8 rounded-full px-2 py-0.5">Demo</span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/50 hover:text-white text-base leading-none transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Slide — key forces remount so animations restart each time */}
        <div className="h-64" key={slide}>
          {slide === 0 && <ScanSlide />}
          {slide === 1 && <RiskSlide />}
          {slide === 2 && <ProfileSlide />}
          {slide === 3 && <ChatSlide />}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/8">
          <p className="text-white text-sm font-semibold">{SLIDES[slide].title}</p>
          <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{SLIDES[slide].description}</p>
          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-1.5">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === slide ? "w-6 bg-[#1e3a2c]" : "w-2 bg-white/20 hover:bg-white/35"
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => goTo((slide - 1 + SLIDES.length) % SLIDES.length)}
                className="text-white/40 hover:text-white/70 text-xs transition-colors px-1"
              >
                ← Prev
              </button>
              <button
                onClick={() => goTo((slide + 1) % SLIDES.length)}
                className="text-white/40 hover:text-white/70 text-xs transition-colors px-1"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
