"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ScanSummary } from "../../lib/types";

const COLOR_DOT: Record<string, string> = {
  green: "#22c55e",
  yellow: "#facc15",
  red: "#ef4444",
};

const COLOR_LABEL: Record<string, string> = {
  green: "Looked safe",
  yellow: "Some caution items",
  red: "Risky items found",
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const [scans, setScans] = useState<ScanSummary[] | null>(null);

  useEffect(() => {
    fetch("/api/scans")
      .then((r) => r.json())
      .then((data) => setScans(data.scans ?? []));
  }, []);

  return (
    <main className="max-w-3xl mx-auto px-6 py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meal History</h1>
        <p className="text-gray-500 mt-1">Every scan you&apos;ve taken, with the score it got at the time.</p>
      </div>

      {scans === null && <p className="text-gray-400 text-sm">Loading...</p>}

      {scans?.length === 0 && (
        <div className="rounded-2xl border border-black/5 bg-white p-10 text-center space-y-3">
          <div className="text-3xl">🍽️</div>
          <p className="text-gray-500">No scans yet — your first one will show up here.</p>
          <Link href="/" className="inline-block text-sm font-medium text-brand hover:underline">
            Scan a meal →
          </Link>
        </div>
      )}

      <div className="space-y-2.5">
        {scans?.map((scan) => (
          <Link
            key={scan.id}
            href={`/scan/${scan.id}`}
            className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-3 hover:shadow-sm transition-shadow"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={scan.image_url}
              alt="Scanned meal"
              className="w-16 h-16 rounded-xl object-cover border border-black/5 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-400">{formatTimestamp(scan.created_at)}</p>
              <p className="font-medium truncate">
                {scan.item_count} item{scan.item_count === 1 ? "" : "s"} &middot; scored against{" "}
                <span className="text-gray-600">{scan.profile_label}</span>
              </p>
            </div>
            {scan.worst_color && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 shrink-0">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLOR_DOT[scan.worst_color] }}
                />
                {COLOR_LABEL[scan.worst_color]}
              </span>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}
