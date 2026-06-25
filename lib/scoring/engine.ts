// Deterministic, pure scoring engine. Zero network/LLM calls by design —
// this is what makes the live profile-switch rescore demo instant and never flake.
import { GLYCEMIC, CHOLESTEROL_MG, SODIUM_MG, RISK_SCORE_BY_COLOR } from "./thresholds";

export type Severity = "mild" | "moderate" | "severe";
export type Flag = "green" | "yellow" | "red";

export type RuleKey =
  | "glycemic_sensitivity"
  | "cholesterol_sensitivity"
  | "sodium_sensitivity"
  | "allergen_avoid"
  | "vegan_avoid"
  | "vegetarian_avoid"
  | "keto_avoid";

export interface ConditionInput {
  ruleKey: RuleKey;
  severity: Severity;
  allergenTag?: string; // only populated for allergen_avoid rows, e.g. 'peanut'
}

export interface NutritionRowInput {
  glycemicIndex: number | null;
  glycemicLoad: number | null;
  cholesterolMg: number | null;
  saturatedFatG: number | null;
  sodiumMg: number | null;
  sugarG: number | null;
  allergenTags: string[];
  dietFlags: string[];
  keyNutrients: Record<string, number>;
  caloriesKcal?: number | null;
  fatG?: number | null;
  carbsG?: number | null;
  proteinG?: number | null;
  fiberG?: number | null;
}

export interface RiskFlag {
  rule: string;
  flag: Flag;
  detail: string;
}

export interface ScoringResult {
  color: Flag;
  riskScore: number;
  reasoning: string;
  riskBreakdown: RiskFlag[];
}

function rank(c: Flag): number {
  return c === "red" ? 2 : c === "yellow" ? 1 : 0;
}

function scoreGlycemic(n: NutritionRowInput, severity: Severity): RiskFlag {
  const gi = n.glycemicIndex;
  if (gi == null) {
    return { rule: "glycemic", flag: "green", detail: "No significant glycemic impact." };
  }
  const t = GLYCEMIC[severity];
  const flag: Flag = gi >= t.red ? "red" : gi >= t.yellow ? "yellow" : "green";
  const detail =
    flag === "green"
      ? `Glycemic index ${gi} is within a safe range for your sensitivity.`
      : `Glycemic index ${gi} may spike blood sugar given your glycemic sensitivity (${severity}).`;
  return { rule: "glycemic", flag, detail };
}

function scoreCholesterol(n: NutritionRowInput, severity: Severity): RiskFlag {
  const chol = n.cholesterolMg;
  if (chol == null) {
    return { rule: "cholesterol", flag: "green", detail: "No significant cholesterol content." };
  }
  const t = CHOLESTEROL_MG[severity];
  const flag: Flag = chol >= t.red ? "red" : chol >= t.yellow ? "yellow" : "green";
  const detail =
    flag === "green"
      ? `Cholesterol ${chol}mg per serving is fine for your profile.`
      : `Cholesterol ${chol}mg per serving is risky given your cholesterol sensitivity (${severity}).`;
  return { rule: "cholesterol", flag, detail };
}

function scoreSodium(n: NutritionRowInput, severity: Severity): RiskFlag {
  const sodium = n.sodiumMg;
  if (sodium == null) {
    return { rule: "sodium", flag: "green", detail: "No significant sodium content." };
  }
  const t = SODIUM_MG[severity];
  const flag: Flag = sodium >= t.red ? "red" : sodium >= t.yellow ? "yellow" : "green";
  const detail =
    flag === "green"
      ? `Sodium ${sodium}mg per serving is within a safe range.`
      : `Sodium ${sodium}mg per serving is high given your sodium sensitivity (${severity}).`;
  return { rule: "sodium", flag, detail };
}

function scoreAllergen(n: NutritionRowInput, cond: ConditionInput): RiskFlag {
  const tag = cond.allergenTag;
  if (!tag) {
    return { rule: "allergen", flag: "green", detail: "No allergen specified." };
  }
  const hasAllergen = n.allergenTags.includes(tag);
  if (!hasAllergen) {
    return { rule: "allergen", flag: "green", detail: `No ${tag} detected.` };
  }
  // Any allergen presence is red regardless of severity — allergens are not a dial, they're a switch.
  return { rule: "allergen", flag: "red", detail: `Contains ${tag}, which you are allergic to.` };
}

function scoreDietFlag(n: NutritionRowInput, unsafeFlag: string, dietLabel: string): RiskFlag {
  const isUnsafe = n.dietFlags.includes(unsafeFlag);
  return isUnsafe
    ? { rule: "diet", flag: "red", detail: `Not ${dietLabel}-friendly.` }
    : { rule: "diet", flag: "green", detail: `Fits a ${dietLabel} diet.` };
}

function buildReasoning(flags: RiskFlag[], worst: Flag): string {
  if (flags.length === 0) {
    return worst === "green" ? "Looks safe for your profile." : "Flagged for your profile.";
  }
  const worstFlags = flags.filter((f) => f.flag === worst);
  const lead = worstFlags[0]?.detail ?? "";
  if (worst === "green") {
    return lead || "Fits your health profile well.";
  }
  return lead;
}

export function scoreItem(
  conditions: ConditionInput[],
  nutrition: NutritionRowInput | null,
): ScoringResult {
  if (!nutrition) {
    return {
      color: "yellow",
      riskScore: RISK_SCORE_BY_COLOR.yellow,
      reasoning: "Couldn't confidently identify this item's nutrition data — treat with caution.",
      riskBreakdown: [],
    };
  }

  const flags: RiskFlag[] = [];

  for (const cond of conditions) {
    switch (cond.ruleKey) {
      case "glycemic_sensitivity":
        flags.push(scoreGlycemic(nutrition, cond.severity));
        break;
      case "cholesterol_sensitivity":
        flags.push(scoreCholesterol(nutrition, cond.severity));
        break;
      case "sodium_sensitivity":
        flags.push(scoreSodium(nutrition, cond.severity));
        break;
      case "allergen_avoid":
        flags.push(scoreAllergen(nutrition, cond));
        break;
      case "vegan_avoid":
        flags.push(scoreDietFlag(nutrition, "vegan_unsafe", "vegan"));
        break;
      case "vegetarian_avoid":
        flags.push(scoreDietFlag(nutrition, "vegetarian_unsafe", "vegetarian"));
        break;
      case "keto_avoid":
        flags.push(scoreDietFlag(nutrition, "keto_unsafe", "keto"));
        break;
    }
  }

  const worst = flags.reduce<Flag>((acc, f) => (rank(f.flag) > rank(acc) ? f.flag : acc), "green");
  const riskScore = RISK_SCORE_BY_COLOR[worst];
  const reasoning = buildReasoning(flags, worst);

  return { color: worst, riskScore, reasoning, riskBreakdown: flags };
}
