export type Severity = "mild" | "moderate" | "severe";
export type Color = "green" | "yellow" | "red";

export interface ConditionCatalogItem {
  id: string;
  code: string | null;
  label: string;
  category: string;
  is_preset: boolean;
  rule_key: string;
}

export interface HealthProfile {
  id: string;
  user_id: string;
  label: string;
  is_active: boolean;
}

export interface RiskFlag {
  rule: string;
  flag: Color;
  detail: string;
}

export interface ScanItem {
  id: string;
  scan_id: string;
  detected_label: string;
  point_x: string | number;
  point_y: string | number;
  confidence: number | null;
  matched_nutrition_item_id: string | null;
  match_score: string | number | null;
  match_method: string | null;
  color: Color | null;
  risk_score: string | number | null;
  reasoning: string | null;
  risk_breakdown: RiskFlag[] | null;
}

export interface Scan {
  id: string;
  user_id: string;
  health_profile_id: string;
  image_url: string;
  image_width: number | null;
  image_height: number | null;
  status: string;
}

export interface ScanSummary {
  id: string;
  image_url: string;
  status: string;
  created_at: string;
  profile_label: string;
  item_count: number;
  avg_risk_score: number | null;
  worst_color: Color | null;
}

export interface ChatMessage {
  id: string;
  scan_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface DailyNutritionTotals {
  caloriesKcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  cholesterolMg: number;
}

export interface DailyNutritionItem {
  scanId: string;
  scanCreatedAt: string;
  detectedLabel: string;
  canonicalName: string | null;
  caloriesKcal: number | null;
  carbsG: number | null;
  proteinG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  cholesterolMg: number | null;
  keyNutrients: Record<string, number>;
}

export interface DailyNutritionResponse {
  date: string;
  totals: DailyNutritionTotals;
  micronutrients: Record<string, number>;
  items: DailyNutritionItem[];
}

export interface ProfileConditionSelection {
  conditionCode?: string;
  customLabel?: string;
  ruleKey: string;
  allergenTag?: string;
  severity: Severity;
}
