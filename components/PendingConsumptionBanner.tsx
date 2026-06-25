"use client";

import { useEffect, useState } from "react";
import type { PendingConsumptionItem } from "../lib/types";

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// Review queue for items left unconfirmed after a scan — plans change, people
// skip the unhealthy item, so confirming right away isn't always realistic.
// Shown on next visit so nothing the user actually ate is missing from the
// dashboard, and nothing they skipped is wrongly counted.
export default function PendingConsumptionBanner() {
  const [items, setItems] = useState<PendingConsumptionItem[] | null>(null);

  useEffect(() => {
    fetch("/api/consumption/pending")
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []));
  }, []);

  async function respond(itemId: string, consumed: boolean) {
    setItems((prev) => (prev ? prev.filter((it) => it.id !== itemId) : prev));
    await fetch(`/api/scan-items/${itemId}/consumption`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consumed }),
    });
  }

  if (!items || items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-black/5 bg-white shadow-sm p-5 animate-fade-in">
      <h2 className="font-semibold mb-1">Did you eat these?</h2>
      <p className="text-sm text-gray-500 mb-4">
        {items.length} item{items.length === 1 ? "" : "s"} from past scans still need a yes or no before they count toward
        your nutrition dashboard.
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="shrink-0 w-40 rounded-xl border border-black/5 overflow-hidden bg-gray-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.scanImageUrl} alt={item.detectedLabel} className="w-full h-24 object-cover" />
            <div className="p-2.5 space-y-2">
              <div>
                <p className="text-sm font-medium capitalize truncate">{item.canonicalName ?? item.detectedLabel}</p>
                <p className="text-xs text-gray-400">{formatTimestamp(item.scanCreatedAt)}</p>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => respond(item.id, true)}
                  className="flex-1 text-xs font-medium rounded-full py-1.5 bg-green-100 text-green-700 hover:bg-green-500 hover:text-white transition-colors"
                >
                  Ate it
                </button>
                <button
                  onClick={() => respond(item.id, false)}
                  className="flex-1 text-xs font-medium rounded-full py-1.5 bg-gray-100 text-gray-500 hover:bg-gray-400 hover:text-white transition-colors"
                >
                  Skipped
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
