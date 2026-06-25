import { scoreItem, type ConditionInput, type NutritionRowInput, type RiskFlag, type Flag } from "../scoring/engine";

// Swap suggestions are deliberately occasional, not shown on every flagged
// item. They only surface for a clear, repeated pattern (red, not just
// yellow, and recurring) rather than a single one-off occurrence.
export const SWAP_RECURRENCE_WINDOW_DAYS = 14;
export const SWAP_MIN_RECURRENCES = 2;

export interface SwapCandidate {
  id: string;
  canonicalName: string;
  nutrition: NutritionRowInput;
}

export interface SwapSuggestion {
  candidateId: string;
  candidateName: string;
  rule: string;
  message: string;
}

const RULE_LABELS: Record<string, string> = {
  glycemic: "glycemic sensitivity",
  cholesterol: "cholesterol profile",
  sodium: "sodium profile",
  allergen: "allergy",
  diet: "diet",
};

function describeImprovement(rule: string, original: NutritionRowInput, candidate: NutritionRowInput): string | null {
  switch (rule) {
    case "glycemic":
      if (original.glycemicIndex == null || candidate.glycemicIndex == null) return null;
      return `a lower glycemic index (${candidate.glycemicIndex} vs ${original.glycemicIndex})`;
    case "cholesterol":
      if (original.cholesterolMg == null || candidate.cholesterolMg == null) return null;
      return `less cholesterol (${candidate.cholesterolMg}mg vs ${original.cholesterolMg}mg)`;
    case "sodium":
      if (original.sodiumMg == null || candidate.sodiumMg == null) return null;
      return `less sodium (${candidate.sodiumMg}mg vs ${original.sodiumMg}mg)`;
    case "allergen":
      return "none of the allergen you're avoiding";
    case "diet":
      return "a better fit for your diet";
    default:
      return null;
  }
}

function metricFor(rule: string, n: NutritionRowInput): number {
  switch (rule) {
    case "glycemic":
      return n.glycemicIndex ?? Infinity;
    case "cholesterol":
      return n.cholesterolMg ?? Infinity;
    case "sodium":
      return n.sodiumMg ?? Infinity;
    default:
      return 0;
  }
}

// Only ever suggests a candidate that scores fully green against the user's
// CURRENT active profile, re-run through the same deterministic engine that
// flagged the original item — never a hardcoded "healthy food" list. If
// nothing in the same category clears that bar, it suggests nothing rather
// than guessing.
export function findHealthierSwap(
  originalName: string,
  originalNutrition: NutritionRowInput,
  originalBreakdown: RiskFlag[],
  originalColor: Flag,
  conditions: ConditionInput[],
  candidates: SwapCandidate[],
): SwapSuggestion | null {
  if (originalColor === "green" || candidates.length === 0) return null;

  const worstFlag = originalBreakdown.find((f) => f.flag === originalColor) ?? originalBreakdown[0];
  const rule = worstFlag?.rule;
  if (!rule) return null;

  const valid: { candidate: SwapCandidate; reason: string; metric: number }[] = [];

  for (const candidate of candidates) {
    const scored = scoreItem(conditions, candidate.nutrition);
    if (scored.color !== "green") continue;

    const reason = describeImprovement(rule, originalNutrition, candidate.nutrition);
    if (!reason) continue;

    valid.push({ candidate, reason, metric: metricFor(rule, candidate.nutrition) });
  }

  if (valid.length === 0) return null;

  valid.sort((a, b) => a.metric - b.metric);
  const best = valid[0];

  return {
    candidateId: best.candidate.id,
    candidateName: best.candidate.canonicalName,
    rule,
    message: `Try ${best.candidate.canonicalName} instead of ${originalName}. It has ${best.reason}, which is a better fit for your ${
      RULE_LABELS[rule] ?? "profile"
    }.`,
  };
}
