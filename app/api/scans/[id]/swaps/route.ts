import { NextResponse } from "next/server";
import { getOrCreateUserId } from "../../../../../lib/auth";
import { getActiveProfile, getProfileConditions } from "../../../../../lib/db/queries/profiles";
import { getScanItemsWithNutrition, countRedOccurrencesSince } from "../../../../../lib/db/queries/scans";
import { listNutritionItemsByCategory } from "../../../../../lib/db/queries/nutrition";
import { findHealthierSwap, type SwapSuggestion, SWAP_RECURRENCE_WINDOW_DAYS, SWAP_MIN_RECURRENCES } from "../../../../../lib/swaps/findSwap";
import type { NutritionRowInput } from "../../../../../lib/scoring/engine";

function sinceIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

// Per-item "healthier swap" suggestions for a scan, keyed by scan_item id.
// Deliberately occasional: only computed for items that are both high-risk
// (red, not yellow) AND a recurring pattern (flagged red 2+ times in the
// last 14 days), so a single one-off risky item never triggers a nudge.
// Among items that qualify, only ever suggests another curated item that
// scores green for the active profile — never a generic "eat healthier" tip.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: scanId } = await params;
  const userId = await getOrCreateUserId();

  const activeProfile = await getActiveProfile(userId);
  const conditions = activeProfile ? await getProfileConditions(activeProfile.id) : [];

  const items = await getScanItemsWithNutrition(scanId);
  const swaps: Record<string, SwapSuggestion> = {};
  const cutoff = sinceIso(SWAP_RECURRENCE_WINDOW_DAYS);

  for (const item of items) {
    if (!item.matched_nutrition_item_id || !item.category || item.color !== "red") continue;
    if (!item.risk_breakdown || item.risk_breakdown.length === 0) continue;

    const occurrences = await countRedOccurrencesSince(userId, item.matched_nutrition_item_id, cutoff);
    if (occurrences < SWAP_MIN_RECURRENCES) continue;

    const originalNutrition: NutritionRowInput = {
      glycemicIndex: item.glycemic_index,
      glycemicLoad: item.glycemic_load == null ? null : Number(item.glycemic_load),
      cholesterolMg: item.cholesterol_mg == null ? null : Number(item.cholesterol_mg),
      saturatedFatG: item.saturated_fat_g == null ? null : Number(item.saturated_fat_g),
      sodiumMg: item.sodium_mg == null ? null : Number(item.sodium_mg),
      sugarG: item.sugar_g == null ? null : Number(item.sugar_g),
      allergenTags: item.allergen_tags ?? [],
      dietFlags: item.diet_flags ?? [],
      keyNutrients: item.key_nutrients ?? {},
    };

    const candidates = await listNutritionItemsByCategory(item.category, item.matched_nutrition_item_id);

    const swap = findHealthierSwap(
      item.canonical_name ?? item.detected_label,
      originalNutrition,
      item.risk_breakdown,
      item.color,
      conditions,
      candidates,
    );

    if (swap) swaps[item.id] = swap;
  }

  return NextResponse.json({ swaps });
}
