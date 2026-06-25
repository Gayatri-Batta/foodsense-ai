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

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    <main className="max-w-2xl mx-auto px-6 py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ask the Assistant</h1>
        <p className="text-gray-500 mt-1">
          General food and health questions, answered using your active profile and what you&apos;ve confirmed
          eating today. Nothing said here is saved or added to your dashboard.
        </p>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white shadow-sm flex flex-col h-[28rem] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-6">
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
    </main>
  );
}
