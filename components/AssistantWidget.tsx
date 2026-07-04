"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Can I eat a few more chips today?",
  "Is popcorn okay if I have diabetes?",
  "What should I watch out for with high cholesterol?",
];

const IDLE_PROMPTS = [
  "Have a food question? Ask me! 👋",
  "Not sure if a food is safe?",
  "I can help with your health goals!",
  "Ask about your diet anytime 🌿",
];

function SageFace({ size = 30 }: { size?: number }) {
  const scale = size / 34;
  return (
    <svg
      width={size}
      height={Math.round(30 * scale)}
      viewBox="0 0 34 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left eye */}
      <ellipse cx="11" cy="11" rx="3.5" ry="4" fill="white" />
      <circle cx="11.5" cy="12" r="2" fill="#0f2118" />
      <circle cx="12.5" cy="10.5" r="0.8" fill="white" opacity="0.9" />
      {/* Right eye */}
      <ellipse cx="23" cy="11" rx="3.5" ry="4" fill="white" />
      <circle cx="23.5" cy="12" r="2" fill="#0f2118" />
      <circle cx="24.5" cy="10.5" r="0.8" fill="white" opacity="0.9" />
      {/* Smile */}
      <path
        d="M 9 21 Q 17 28 25 21"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [promptIdx, setPromptIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) return;
    const id = setInterval(() => {
      setPromptIdx((i) => (i + 1) % IDLE_PROMPTS.length);
    }, 4000);
    return () => clearInterval(id);
  }, [open]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const historyForRequest = messages;
    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: historyForRequest }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div className="w-80 sm:w-96 rounded-2xl border border-black/5 bg-white shadow-xl flex flex-col h-[26rem] overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 bg-brand-light">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center shrink-0">
                <SageFace size={20} />
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">Sage</p>
                <p className="text-[10px] text-brand/70 leading-tight">Your nutrition advisor</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1 rounded-full hover:bg-white/60 transition-colors"
                  aria-label="Clear chat"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
                aria-label="Close Sage"
              >
                ×
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-4">
                <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center">
                  <SageFace size={30} />
                </div>
                <p className="text-sm text-gray-400">
                  Ask anything — try one below or type your own.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setInput(s);
                        inputRef.current?.focus();
                      }}
                      className="text-xs font-medium text-brand bg-brand-light rounded-full px-3 py-1.5 hover:bg-brand/10 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : ""}`}
              >
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center shrink-0">
                    <SageFace size={14} />
                  </div>
                )}
                <div
                  className={`text-sm rounded-2xl px-3.5 py-2 max-w-[80%] whitespace-pre-wrap ${
                    m.role === "user" ? "bg-brand text-white" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && <div className="text-xs text-gray-400 pl-8">Thinking...</div>}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={handleSend}
            className="border-t border-gray-100 bg-gray-50 flex items-center px-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 px-3 py-3 text-sm outline-none bg-transparent"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending}
              className="text-sm font-medium text-brand px-3 py-1.5 rounded-full hover:bg-brand-light transition-colors disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Character trigger row */}
      <div className="flex items-end gap-3">
        {/* Rotating speech bubble */}
        {!open && (
          <div key={promptIdx} className="animate-bubble-pop mb-1">
            <div className="relative bg-white border border-black/5 rounded-2xl shadow-md px-3.5 py-2.5">
              <p className="text-sm font-medium text-gray-700 whitespace-nowrap">
                {IDLE_PROMPTS[promptIdx]}
              </p>
              {/* Tail pointing right toward character */}
              <svg
                className="absolute -right-2.5 top-1/2 -translate-y-1/2"
                width="11"
                height="20"
                viewBox="0 0 11 20"
              >
                <path d="M 0 2 L 10 10 L 0 18 Z" fill="white" />
                <path
                  d="M 0 2 L 10 10 L 0 18"
                  stroke="rgba(0,0,0,0.06)"
                  strokeWidth="1"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Sage character button */}
        <button
          onClick={() => setOpen((o) => !o)}
          className={`relative shrink-0 ${!open ? "animate-float" : ""}`}
          title="Chat with Sage"
          aria-label="Chat with Sage"
        >
          {/* Pulsing rings */}
          {!open && (
            <>
              <div className="absolute inset-0 rounded-full bg-brand animate-pulse-ring" />
              <div className="absolute inset-0 rounded-full bg-brand animate-pulse-ring [animation-delay:1s]" />
            </>
          )}

          {/* Leaf crown */}
          {!open && (
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xl pointer-events-none select-none z-10">
              🌿
            </span>
          )}

          {/* Face circle */}
          <div className="w-14 h-14 rounded-full bg-brand shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
            {open ? (
              <span className="text-white text-2xl font-light leading-none">×</span>
            ) : (
              <SageFace size={30} />
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
