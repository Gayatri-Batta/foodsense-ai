import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUserId } from "../../../../lib/auth";
import { listDailyNutritionItems, type DailyNutritionTotals } from "../../../../lib/db/queries/scans";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// Daily nutrition dashboard: sums calories/macros across every matched item
// from the user's scans on the given day, plus a JS-side merge of whatever
// micronutrients (key_nutrients JSONB) those items happen to carry — summing
// arbitrary JSONB keys in SQL isn't worth the complexity at this dataset size.
export async function GET(req: NextRequest) {
  const userId = await getOrCreateUserId();
  const date = req.nextUrl.searchParams.get("date") ?? todayUtc();

  const items = await listDailyNutritionItems(userId, date);

  const totals: DailyNutritionTotals = {
    caloriesKcal: 0,
    carbsG: 0,
    proteinG: 0,
    fatG: 0,
    fiberG: 0,
    sugarG: 0,
    sodiumMg: 0,
    cholesterolMg: 0,
  };
  const micronutrients: Record<string, number> = {};

  for (const item of items) {
    totals.caloriesKcal += item.caloriesKcal ?? 0;
    totals.carbsG += item.carbsG ?? 0;
    totals.proteinG += item.proteinG ?? 0;
    totals.fatG += item.fatG ?? 0;
    totals.fiberG += item.fiberG ?? 0;
    totals.sugarG += item.sugarG ?? 0;
    totals.sodiumMg += item.sodiumMg ?? 0;
    totals.cholesterolMg += item.cholesterolMg ?? 0;

    for (const [key, value] of Object.entries(item.keyNutrients)) {
      micronutrients[key] = (micronutrients[key] ?? 0) + value;
    }
  }

  return NextResponse.json({ date, totals, micronutrients, items });
}
