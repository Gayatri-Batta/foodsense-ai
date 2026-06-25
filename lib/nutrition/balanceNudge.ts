import type { DailyNutritionTotals, DailyTotalsRow } from "../db/queries/scans";

export interface BalanceNudge {
  metric: keyof DailyNutritionTotals;
  direction: "high" | "low";
  message: string;
}

interface MetricConfig {
  key: keyof DailyNutritionTotals;
  unit: string;
  minBaseline: number;
  directions: ("high" | "low")[];
}

// minBaseline guards against flagging a metric that's basically noise (e.g.
// 2g of sugar vs a 1g average is a 100% swing but meaningless in absolute
// terms). directions limits which deviations are worth mentioning at all —
// "too much protein" isn't a real concern the way "too little" is.
const METRICS: MetricConfig[] = [
  { key: "caloriesKcal", unit: "kcal", minBaseline: 200, directions: ["high", "low"] },
  { key: "sodiumMg", unit: "mg", minBaseline: 100, directions: ["high"] },
  { key: "sugarG", unit: "g", minBaseline: 5, directions: ["high"] },
  { key: "proteinG", unit: "g", minBaseline: 5, directions: ["low"] },
];

const DEVIATION_THRESHOLD = 0.4; // must be at least 40% off personal average
const MIN_HISTORY_DAYS = 3;

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function buildMessage(metric: MetricConfig, direction: "high" | "low", todayValue: number, avg: number): string {
  const today = round(todayValue);
  const avgRounded = round(avg);

  switch (metric.key) {
    case "caloriesKcal":
      return direction === "low"
        ? `You've logged far fewer calories than usual today (${today} vs your recent average of ${avgRounded} kcal). Make sure you're not skipping meals.`
        : `You've logged more calories than usual today (${today} vs your recent average of ${avgRounded} kcal).`;
    case "sodiumMg":
      return `Your sodium today (${today}mg) is well above your recent average (${avgRounded}mg). Consider lighter options for your next meal.`;
    case "sugarG":
      return `Your sugar intake today (${today}g) is well above your recent average (${avgRounded}g).`;
    case "proteinG":
      return `Your protein today (${today}g) is below your recent average (${avgRounded}g). Consider adding a protein-rich item to your next meal.`;
    default:
      return `Your ${metric.key} today (${today}${metric.unit}) is ${direction === "high" ? "above" : "below"} your recent average (${avgRounded}${metric.unit}).`;
  }
}

// Occasional by construction: most days won't deviate 40%+ from a user's own
// recent average, and there's no output at all until there's enough history
// to know what "usual" looks like for this specific person.
export function findBalanceNudge(today: DailyNutritionTotals, history: DailyTotalsRow[]): BalanceNudge | null {
  if (history.length < MIN_HISTORY_DAYS) return null;

  let best: { metric: MetricConfig; direction: "high" | "low"; deviation: number; avg: number; todayValue: number } | null = null;

  for (const metric of METRICS) {
    const avg = history.reduce((sum, day) => sum + day.totals[metric.key], 0) / history.length;
    if (avg < metric.minBaseline) continue;

    const todayValue = today[metric.key];
    const ratio = todayValue / avg;
    const deviation = Math.abs(ratio - 1);
    if (deviation < DEVIATION_THRESHOLD) continue;

    const direction: "high" | "low" = ratio > 1 ? "high" : "low";
    if (!metric.directions.includes(direction)) continue;

    if (!best || deviation > best.deviation) {
      best = { metric, direction, deviation, avg, todayValue };
    }
  }

  if (!best) return null;

  return {
    metric: best.metric.key,
    direction: best.direction,
    message: buildMessage(best.metric, best.direction, best.todayValue, best.avg),
  };
}
