"use client";

import type { ScanItem } from "../lib/types";

const COLOR_CLASSES: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
};

interface Props {
  imageUrl: string;
  items: ScanItem[];
  selectedItemId: string | null;
  onSelectItem: (item: ScanItem) => void;
}

export default function ImageDotOverlay({ imageUrl, items, selectedItemId, onSelectItem }: Props) {
  return (
    <div className="relative inline-block w-full max-w-xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="Scanned plate" className="w-full rounded border" />
      {items.map((item) => {
        const x = Number(item.point_x) * 100;
        const y = Number(item.point_y) * 100;
        const isSelected = item.id === selectedItemId;
        return (
          <button
            key={item.id}
            onClick={() => onSelectItem(item)}
            onMouseEnter={() => onSelectItem(item)}
            style={{ left: `${x}%`, top: `${y}%` }}
            className={[
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md transition-transform",
              COLOR_CLASSES[item.color ?? "yellow"] ?? "bg-yellow-400",
              isSelected ? "w-8 h-8 ring-2 ring-black scale-110" : "w-6 h-6",
            ].join(" ")}
            title={item.detected_label}
            aria-label={item.detected_label}
          />
        );
      })}
    </div>
  );
}
