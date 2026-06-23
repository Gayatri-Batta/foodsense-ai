import type { RuleKey } from "../scoring/engine";

export interface ConditionPreset {
  code: string;
  label: string;
  category: "metabolic" | "cardiac" | "allergen" | "lifestyle";
  ruleKey: RuleKey;
  allergenTag?: string;
  defaultSeverity: "mild" | "moderate" | "severe";
}

// Mirrored into the `conditions` table by scripts/seed-conditions.ts.
// Add new presets here first, then re-run the seed script.
export const CONDITION_PRESETS: ConditionPreset[] = [
  { code: "diabetes_t1", label: "Type 1 Diabetes", category: "metabolic", ruleKey: "glycemic_sensitivity", defaultSeverity: "severe" },
  { code: "diabetes_t2", label: "Type 2 Diabetes", category: "metabolic", ruleKey: "glycemic_sensitivity", defaultSeverity: "moderate" },
  { code: "prediabetes", label: "Prediabetes", category: "metabolic", ruleKey: "glycemic_sensitivity", defaultSeverity: "mild" },
  { code: "high_cholesterol", label: "High Cholesterol", category: "cardiac", ruleKey: "cholesterol_sensitivity", defaultSeverity: "moderate" },
  { code: "hypertension", label: "Hypertension", category: "cardiac", ruleKey: "sodium_sensitivity", defaultSeverity: "moderate" },
  { code: "vegan", label: "Vegan", category: "lifestyle", ruleKey: "vegan_avoid", defaultSeverity: "moderate" },
  { code: "vegetarian", label: "Vegetarian", category: "lifestyle", ruleKey: "vegetarian_avoid", defaultSeverity: "moderate" },
  { code: "keto", label: "Keto", category: "lifestyle", ruleKey: "keto_avoid", defaultSeverity: "moderate" },
  { code: "allergy_peanut", label: "Peanut Allergy", category: "allergen", ruleKey: "allergen_avoid", allergenTag: "peanut", defaultSeverity: "severe" },
  { code: "allergy_tree_nut", label: "Tree Nut Allergy", category: "allergen", ruleKey: "allergen_avoid", allergenTag: "tree_nut", defaultSeverity: "severe" },
  { code: "allergy_shellfish", label: "Shellfish Allergy", category: "allergen", ruleKey: "allergen_avoid", allergenTag: "shellfish", defaultSeverity: "severe" },
  { code: "allergy_dairy", label: "Dairy Allergy", category: "allergen", ruleKey: "allergen_avoid", allergenTag: "dairy", defaultSeverity: "moderate" },
  { code: "allergy_egg", label: "Egg Allergy", category: "allergen", ruleKey: "allergen_avoid", allergenTag: "egg", defaultSeverity: "moderate" },
  { code: "allergy_gluten", label: "Gluten Allergy / Celiac", category: "allergen", ruleKey: "allergen_avoid", allergenTag: "gluten", defaultSeverity: "severe" },
  { code: "allergy_soy", label: "Soy Allergy", category: "allergen", ruleKey: "allergen_avoid", allergenTag: "soy", defaultSeverity: "moderate" },
];

// Quick-start bundles shown in the profile selector UI.
export const PROFILE_PRESET_BUNDLES: { label: string; conditionCodes: string[] }[] = [
  { label: "Diabetic", conditionCodes: ["diabetes_t2"] },
  { label: "High Cholesterol", conditionCodes: ["high_cholesterol"] },
  { label: "Vegan", conditionCodes: ["vegan"] },
  { label: "Diabetic + High Cholesterol", conditionCodes: ["diabetes_t2", "high_cholesterol"] },
  { label: "Peanut + Tree Nut Allergy", conditionCodes: ["allergy_peanut", "allergy_tree_nut"] },
];
