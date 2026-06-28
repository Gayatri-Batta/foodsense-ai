"use client";

import { useEffect, useMemo, useState } from "react";
import type { PendingConsumptionItem } from "../lib/types";

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

interface ScanGroup {
  scanId: string;
  scanImageUrl: string;
  scanCreatedAt: string;
  items: PendingConsumptionItem[];
}

function groupByScan(items: PendingConsumptionItem[]): ScanGroup[] {
  const groups = new Map<string, ScanGroup>();
  for (const item of items) {
    const existing = groups.get(item.scanId);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(item.scanId, {
        scanId: item.scanId,
        scanImageUrl: item.scanImageUrl,
        scanCreatedAt: item.scanCreatedAt,
        items: [item],
      });
    }
  }
  return Array.from(groups.values());
}

// Review queue for items left unconfirmed after a scan — plans change, people
// skip the unhealthy item, so confirming right away isn't always realistic.
// Shown on next visit so nothing the user actually ate is missing from the
// dashboard, and nothing they skipped is wrongly counted. Grouped by scan so
// one meal's photo isn't repeated once per item.
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

  async function respondAll(groupItems: PendingConsumptionItem[], consumed: boolean) {
    const ids = new Set(groupItems.map((it) => it.id));
    setItems((prev) => (prev ? prev.filter((it) => !ids.has(it.id)) : prev));
    await Promise.all(
      groupItems.map((it) =>
        fetch(`/api/scan-items/${it.id}/consumption`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consumed }),
        }),
      ),
    );
  }

  const groups = useMemo(() => groupByScan(items ?? []), [items]);

  if (!items || items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-black/5 bg-white shadow-sm p-5 animate-fade-in">
      <h2 className="font-semibold mb-1">Did you eat these?</h2>
      <p className="text-sm text-gray-500 mb-4">
        {items.length} item{items.length === 1 ? "" : "s"} from past scans still need a yes or no before they count toward
        your nutrition dashboard.
      </p>
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.scanId} className="rounded-xl border border-black/5 overflow-hidden">
            <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border-b border-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={group.scanImageUrl}
                alt=""
                className="w-10 h-10 rounded-lg object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-600">{formatTimestamp(group.scanCreatedAt)}</p>
                <p className="text-xs text-gray-400">
                  {group.items.length} item{group.items.length === 1 ? "" : "s"}
                </p>
              </div>
              {group.items.length > 1 && (
                <button
                  onClick={() => respondAll(group.items, true)}
                  className="text-xs font-medium text-brand whitespace-nowrap hover:underline"
                >
                  Ate it all
                </button>
              )}
            </div>
            <ul className="divide-y divide-gray-50">
              {group.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="text-sm capitalize truncate flex-1">{item.canonicalName ?? item.detectedLabel}</span>
                  <button
                    onClick={() => respond(item.id, true)}
                    title="Ate it"
                    aria-label="Ate it"
                    className="w-7 h-7 rounded-full flex items-center justify-center text-green-600 bg-green-50 hover:bg-green-500 hover:text-white transition-colors shrink-0"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => respond(item.id, false)}
                    title="Skipped"
                    aria-label="Skipped"
                    className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 bg-gray-50 hover:bg-gray-400 hover:text-white transition-colors shrink-0"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
