"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ImageDotOverlay from "../../../components/ImageDotOverlay";
import ItemTooltipCard from "../../../components/ItemTooltipCard";
import ChatPanel from "../../../components/ChatPanel";
import type { Scan, ScanItem, SwapSuggestion } from "../../../lib/types";

const DOT_COLOR: Record<string, string> = {
  green: "#22c55e",
  yellow: "#facc15",
  red: "#ef4444",
};

export default function ScanPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const [scan, setScan] = useState<Scan | null>(null);
  const [items, setItems] = useState<ScanItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ScanItem | null>(null);
  const [rescoring, setRescoring] = useState(false);
  const [swaps, setSwaps] = useState<Record<string, SwapSuggestion>>({});

  useEffect(() => {
    fetch(`/api/scans/${scanId}`)
      .then((r) => r.json())
      .then((data) => {
        setScan(data.scan ?? null);
        setItems(data.items ?? []);
      });
  }, [scanId]);

  useEffect(() => {
    fetch(`/api/scans/${scanId}/swaps`)
      .then((r) => r.json())
      .then((data) => setSwaps(data.swaps ?? {}));
  }, [scanId]);

  async function handleProfileSwitched() {
    setRescoring(true);
    const res = await fetch(`/api/scans/${scanId}/rescore`, { method: "POST" });
    const data = await res.json();
    setItems(data.items ?? []);
    setSelectedItem(null);

    const swapsRes = await fetch(`/api/scans/${scanId}/swaps`);
    const swapsData = await swapsRes.json();
    setSwaps(swapsData.swaps ?? {});

    setRescoring(false);
  }

  useEffect(() => {
    window.addEventListener("profile-switched", handleProfileSwitched);
    return () => window.removeEventListener("profile-switched", handleProfileSwitched);
  }, [scanId]);

  async function setConsumed(itemId: string, consumed: boolean | null) {
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, consumed } : it)));
    await fetch(`/api/scan-items/${itemId}/consumption`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consumed }),
    });
  }

  if (!scan) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-24 text-center text-gray-400">
        Loading scan...
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-8 space-y-6 animate-fade-in">
      <Link href="/" className="text-sm font-medium text-gray-500 hover:text-brand transition-colors">
        ← New scan
      </Link>

      {rescoring && (
        <p className="text-sm text-brand flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          Re-scoring every item for the new profile...
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-6 items-start">
        <ImageDotOverlay
          imageUrl={scan.image_url}
          items={items}
          selectedItemId={selectedItem?.id ?? null}
          onSelectItem={setSelectedItem}
        />
        <div className="space-y-4">
          <ItemTooltipCard item={selectedItem} swap={selectedItem ? swaps[selectedItem.id] : null} />
          <div className="rounded-2xl border border-black/5 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Detected items</h3>
            <p className="text-xs text-gray-400 mb-2.5">
              Mark what you actually ate — only confirmed items count toward your nutrition dashboard.
            </p>
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedItem(item)}
                    className={`text-sm text-left flex-1 min-w-0 rounded-lg px-2.5 py-2 transition-colors flex items-center gap-2 ${
                      selectedItem?.id === item.id ? "bg-brand-light" : "hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: DOT_COLOR[item.color ?? "yellow"] }}
                    />
                    <span className="capitalize truncate">{item.detected_label}</span>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setConsumed(item.id, item.consumed === true ? null : true)}
                      title="Ate this"
                      className={`w-7 h-7 rounded-full text-xs flex items-center justify-center transition-colors ${
                        item.consumed === true ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400 hover:bg-green-100"
                      }`}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setConsumed(item.id, item.consumed === false ? null : false)}
                      title="Skipped this"
                      className={`w-7 h-7 rounded-full text-xs flex items-center justify-center transition-colors ${
                        item.consumed === false ? "bg-gray-400 text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                      }`}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
              {items.length === 0 && <p className="text-sm text-gray-400">No items detected.</p>}
            </ul>
          </div>
        </div>
      </div>

      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2.5">Ask about this scan</h3>
        <ChatPanel scanId={scan.id} />
      </section>
    </main>
  );
}
