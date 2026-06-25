import { NextResponse } from "next/server";
import { getOrCreateUserId } from "../../../../../lib/auth";
import { getActiveProfile, getProfileConditions } from "../../../../../lib/db/queries/profiles";
import { getScanItemsWithNutrition } from "../../../../../lib/db/queries/scans";
import { listNutritionItemsByCategory } from "../../../../../lib/db/queries/nutrition";
import { findHealthierSwap, type SwapSuggestion } from "../../../../../lib/swaps/findSwap";
import type { NutritionRowInput } from "../../../../../lib/scoring/engine";

// Per-item "healthier swap" suggestions for a scan, keyed by scan_item id.
// Only computed for items that are currently flagged (not green) against the
// active profile, and only ever suggests another curated item that scores
// green for the same profile — never a generic "eat healthier" tip.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: scanId } = await params;
  const userId = await getOrCreateUserId();

  const activeProfile = await getActiveProfile(userId);
  const conditions = activeProfile ? await getProfileConditions(activeProfile.id) : [];

  const items = await getScanItemsWithNutrition(scanId);
  const swaps: Record<string, SwapSuggestion> = {};

  for (const item of items) {
    if (!item.matched_nutrition_item_id || !item.category || !item.color) continue;
    if (!item.risk_breakdown || item.risk_breakdown.length === 0) continue;

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
