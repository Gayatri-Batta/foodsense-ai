import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUserId } from "../../../../lib/auth";
import { listDailyNutritionItems } from "../../../../lib/db/queries/scans";
import { sumDailyNutrition } from "../../../../lib/nutrition/aggregate";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// Daily nutrition dashboard: sums calories/macros across every matched item
// from the user's scans on the given day, plus a JS-side merge of whatever
// micronutrients (key_nutrients JSONB) those items happen to carry. Summing
// arbitrary JSONB keys in SQL isn't worth the complexity at this dataset size.
export async function GET(req: NextRequest) {
  const userId = await getOrCreateUserId();
  const date = req.nextUrl.searchParams.get("date") ?? todayUtc();

  const items = await listDailyNutritionItems(userId, date);
  const { totals, micronutrients } = sumDailyNutrition(items);

  return NextResponse.json({ date, totals, micronutrients, items });
}
