import type { DailyNutritionItem, DailyNutritionTotals } from "../db/queries/scans";

// Shared by the dashboard endpoint and the general assistant, which both need
// the same day's totals — one to display them, the other to reason about
// "do I have room for a snack" style questions without re-deriving the sums.
export function sumDailyNutrition(items: DailyNutritionItem[]): {
  totals: DailyNutritionTotals;
  micronutrients: Record<string, number>;
} {
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

  return { totals, micronutrients };
}
