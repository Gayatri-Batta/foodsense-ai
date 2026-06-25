import type { ScanItem, SwapSuggestion } from "../lib/types";

const COLOR_BADGE: Record<string, string> = {
  green: "bg-green-100 text-green-700",
  yellow: "bg-yellow-100 text-yellow-700",
  red: "bg-red-100 text-red-700",
};

const RULE_ICON: Record<string, string> = {
  glycemic: "🩸",
  cholesterol: "❤️",
  sodium: "🧂",
  allergen: "🥜",
  diet: "🌱",
};

export default function ItemTooltipCard({ item, swap }: { item: ScanItem | null; swap?: SwapSuggestion | null }) {
  if (!item) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white p-5 text-sm text-gray-400 text-center">
        Hover or tap a dot on the photo to see its breakdown.
      </div>
    );
  }

  const badgeClass = COLOR_BADGE[item.color ?? "yellow"] ?? COLOR_BADGE.yellow;

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold capitalize">{item.detected_label}</h3>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>
          {(item.color ?? "yellow").toUpperCase()}
        </span>
      </div>
      <p className="text-sm text-gray-600">{item.reasoning}</p>
      {item.risk_breakdown && item.risk_breakdown.length > 0 && (
        <ul className="text-sm text-gray-600 space-y-1.5 pt-3 border-t border-gray-100">
          {item.risk_breakdown.map((flag, i) => (
            <li key={i} className="flex gap-2">
              <span>{RULE_ICON[flag.rule] ?? "•"}</span>
              <span>
                <span className="font-medium capitalize">{flag.rule}:</span> {flag.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
      {item.match_method === "unmatched" && (
        <p className="text-xs text-gray-400 italic pt-1">No confident nutrition match found.</p>
      )}
      {swap && (
        <div className="rounded-xl bg-green-50 border border-green-100 px-3 py-2.5 flex gap-2">
          <span className="text-base shrink-0">🌿</span>
          <p className="text-sm text-green-800">{swap.message}</p>
        </div>
      )}
    </div>
  );
}
