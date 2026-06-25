"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../lib/types";

const SUGGESTIONS = ["What's the riskiest item here?", "Is the rice safe for me?", "Suggest a swap for the dessert"];

export default function ChatPanel({ scanId }: { scanId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/scans/${scanId}/chat`)
      .then((r) => r.json())
      .then((data) => setMessages(data.messages ?? []));
  }, [scanId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setInput("");
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, scan_id: scanId, role: "user", content: text, created_at: new Date().toISOString() },
    ]);

    try {
      const res = await fetch(`/api/scans/${scanId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white shadow-sm flex flex-col h-80 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-4">
            <span className="text-2xl">💬</span>
            <p className="text-sm text-gray-400">Ask anything about this scan — try one below, or type your own.</p>
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
        {messages.map((m) => (
          <div key={m.id} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && (
              <span className="w-6 h-6 rounded-full bg-brand-light text-xs flex items-center justify-center shrink-0">
                🤖
              </span>
            )}
            <div
              className={`text-sm rounded-2xl px-3.5 py-2 max-w-[80%] ${
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
          placeholder="Type your question here..."
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
  );
}
