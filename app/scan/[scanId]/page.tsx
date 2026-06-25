"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ImageDotOverlay from "../../../components/ImageDotOverlay";
import ItemTooltipCard from "../../../components/ItemTooltipCard";
import ProfileSwitcher from "../../../components/ProfileSwitcher";
import ChatPanel from "../../../components/ChatPanel";
import type { Scan, ScanItem } from "../../../lib/types";

export default function ScanPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const [scan, setScan] = useState<Scan | null>(null);
  const [items, setItems] = useState<ScanItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ScanItem | null>(null);
  const [rescoring, setRescoring] = useState(false);

  useEffect(() => {
    fetch(`/api/scans/${scanId}`)
      .then((r) => r.json())
      .then((data) => {
        setScan(data.scan ?? null);
        setItems(data.items ?? []);
      });
  }, [scanId]);

  async function handleProfileSwitched() {
    setRescoring(true);
    const res = await fetch(`/api/scans/${scanId}/rescore`, { method: "POST" });
    const data = await res.json();
    setItems(data.items ?? []);
    setSelectedItem(null);
    setRescoring(false);
  }

  if (!scan) {
    return <main className="p-8">Loading scan...</main>;
  }

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-blue-600">
          New scan
        </Link>
        <ProfileSwitcher onSwitched={handleProfileSwitched} />
      </div>

      {rescoring && <p className="text-sm text-gray-500">Re-scoring for new profile...</p>}

      <div className="grid md:grid-cols-2 gap-6">
        <ImageDotOverlay
          imageUrl={scan.image_url}
          items={items}
          selectedItemId={selectedItem?.id ?? null}
          onSelectItem={setSelectedItem}
        />
        <div className="space-y-3">
          <ItemTooltipCard item={selectedItem} />
          <div>
            <h3 className="text-sm font-semibold mb-2">All detected items</h3>
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setSelectedItem(item)}
                    className={`text-sm text-left w-full rounded px-2 py-1 ${
                      selectedItem?.id === item.id ? "bg-gray-100" : ""
                    }`}
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-2"
                      style={{
                        backgroundColor:
                          item.color === "red" ? "#ef4444" : item.color === "green" ? "#22c55e" : "#facc15",
                      }}
                    />
                    {item.detected_label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <section>
        <h3 className="text-sm font-semibold mb-2">Ask about this scan</h3>
        <ChatPanel scanId={scan.id} />
      </section>
    </main>
  );
}
