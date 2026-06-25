"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../lib/types";

export default function ChatPanel({ scanId }: { scanId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
    <div className="border rounded flex flex-col h-80">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400">Ask a question about this scan, e.g. &quot;Is the rice safe for me?&quot;</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`text-sm rounded px-3 py-2 max-w-[85%] ${
              m.role === "user" ? "bg-black text-white ml-auto" : "bg-gray-100 text-gray-800"
            }`}
          >
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="border-t flex">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a follow-up question..."
          className="flex-1 px-3 py-2 text-sm outline-none"
          disabled={sending}
        />
        <button type="submit" disabled={sending} className="px-4 text-sm font-medium disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}
