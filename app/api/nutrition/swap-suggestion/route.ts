import { NextResponse } from "next/server";
import { getOrCreateUserId } from "../../../../lib/auth";
import { getActiveProfile, getProfileConditions } from "../../../../lib/db/queries/profiles";
import { listFrequentlyEatenNutritionItems } from "../../../../lib/db/queries/scans";
import { listNutritionItemsByCategory } from "../../../../lib/db/queries/nutrition";
import { findHealthierSwap } from "../../../../lib/swaps/findSwap";
import { scoreItem } from "../../../../lib/scoring/engine";

const FREQUENT_ITEMS_TO_CONSIDER = 5;

// The "past eating habits" half of the swap feature: looks at what the user
// has actually confirmed eating most often, picks the first one that scores
// against their live profile (not a stale historical score), and only
// returns a suggestion if a same-category alternative comes back green.
export async function GET() {
  const userId = await getOrCreateUserId();
  const activeProfile = await getActiveProfile(userId);
  const conditions = activeProfile ? await getProfileConditions(activeProfile.id) : [];

  const frequent = await listFrequentlyEatenNutritionItems(userId, FREQUENT_ITEMS_TO_CONSIDER);

  for (const item of frequent) {
    if (!item.category) continue;

    const scored = scoreItem(conditions, item.nutrition);
    if (scored.color === "green") continue;

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
