import { NextResponse } from "next/server";
import { getOrCreateUserId } from "../../../../lib/auth";
import { getActiveProfile, getProfileConditions } from "../../../../lib/db/queries/profiles";
import { listRecurringRedNutritionItems } from "../../../../lib/db/queries/scans";
import { listNutritionItemsByCategory } from "../../../../lib/db/queries/nutrition";
import { findHealthierSwap, SWAP_RECURRENCE_WINDOW_DAYS, SWAP_MIN_RECURRENCES } from "../../../../lib/swaps/findSwap";
import { scoreItem } from "../../../../lib/scoring/engine";

const CANDIDATES_TO_CONSIDER = 5;

function sinceIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

// The "past eating habits" half of the swap feature: deliberately occasional,
// only considers foods confirmed-eaten and scored red 2+ times in the last
// 14 days, so most dashboard visits won't show anything. Re-scores against
// the live profile (not the stale historical color) before suggesting.
export async function GET() {
  const userId = await getOrCreateUserId();
  const activeProfile = await getActiveProfile(userId);
  const conditions = activeProfile ? await getProfileConditions(activeProfile.id) : [];

  const recurring = await listRecurringRedNutritionItems(
    userId,
    sinceIso(SWAP_RECURRENCE_WINDOW_DAYS),
    SWAP_MIN_RECURRENCES,
    CANDIDATES_TO_CONSIDER,
  );

  for (const item of recurring) {
    if (!item.category) continue;

    const scored = scoreItem(conditions, item.nutrition);
    if (scored.color !== "red") continue;

    const candidates = await listNutritionItemsByCategory(item.category, item.id);
    const swap = findHealthierSwap(item.canonicalName, item.nutrition, scored.riskBreakdown, scored.color, conditions, candidates);

    if (swap) {
      return NextResponse.json({
        suggestion: swap,
        basedOn: { canonicalName: item.canonicalName, timesEaten: item.timesEaten },
      });
    }
  }

  return NextResponse.json({ suggestion: null, basedOn: null });
}
