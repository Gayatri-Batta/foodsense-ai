import type { ScanItem } from "../lib/types";

const COLOR_BADGE: Record<string, string> = {
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
};

export default function ItemTooltipCard({ item }: { item: ScanItem | null }) {
  if (!item) {
    return (
      <div className="border rounded p-4 text-sm text-gray-500">
        Hover or tap a dot on the image to see its breakdown.
      </div>
    );
  }

  const badgeClass = COLOR_BADGE[item.color ?? "yellow"] ?? COLOR_BADGE.yellow;

  return (
    <div className="border rounded p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold capitalize">{item.detected_label}</h3>
        <span className={`text-xs font-medium px-2 py-1 rounded ${badgeClass}`}>
          {(item.color ?? "yellow").toUpperCase()}
        </span>
      </div>
      <p className="text-sm text-gray-700">{item.reasoning}</p>
      {item.risk_breakdown && item.risk_breakdown.length > 0 && (
        <ul className="text-xs text-gray-600 space-y-1 pt-2 border-t">
          {item.risk_breakdown.map((flag, i) => (
            <li key={i}>
              <span className="font-medium capitalize">{flag.rule}:</span> {flag.detail}
            </li>
          ))}
        </ul>
      )}
      {item.match_method === "unmatched" && (
        <p className="text-xs text-gray-400 italic">No confident nutrition match found.</p>
      )}
    </div>
  );
}
