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

// Floating popup instead of its own nav tab/page — a separate tab made
// navigation feel heavier than a quick question warrants. Lives only on the
// home page, collapsed by default, expands in place.
export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

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
      {open && (
        <div className="w-80 sm:w-96 rounded-2xl border border-black/5 bg-white shadow-xl flex flex-col h-[26rem] overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 bg-brand-light">
            <div>
              <p className="font-semibold text-sm">Assistant</p>
              <p className="text-xs text-gray-500">Nothing here is saved or added to your dashboard.</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
              aria-label="Close assistant"
            >
              ×
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-4">
                <span className="text-2xl">🤖</span>
                <p className="text-sm text-gray-400">Ask anything, try one below or type your own.</p>
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
              <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <span className="w-6 h-6 rounded-full bg-brand-light text-xs flex items-center justify-center shrink-0">
                    🤖
                  </span>
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
          <form onSubmit={handleSend} className="border-t border-gray-100 bg-gray-50 flex items-center px-2">
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

      <button
        onClick={() => setOpen((o) => !o)}
        className="w-14 h-14 rounded-full bg-brand text-white shadow-lg flex items-center justify-center text-2xl hover:bg-brand-dark transition-colors"
        title="Ask the assistant"
        aria-label="Ask the assistant"
      >
        {open ? "×" : "🤖"}
      </button>
    </div>
  );
}
