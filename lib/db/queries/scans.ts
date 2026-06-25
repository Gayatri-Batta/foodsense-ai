import { query } from "../pool";
import type { RiskFlag, NutritionRowInput } from "../../scoring/engine";

export interface ScanRow {
  id: string;
  user_id: string;
  health_profile_id: string;
  image_url: string;
  image_width: number | null;
  image_height: number | null;
  status: string;
  created_at: string;
}

export interface ScanSummaryRow {
  id: string;
  image_url: string;
  status: string;
  created_at: string;
  profile_label: string;
  item_count: number;
  avg_risk_score: number | null;
  worst_color: "green" | "yellow" | "red" | null;
}

export interface ScanItemRow {
  id: string;
  scan_id: string;
  detected_label: string;
  point_x: number;
  point_y: number;
  matched_nutrition_item_id: string | null;
  match_score: number | null;
  match_method: string | null;
  color: "green" | "yellow" | "red" | null;
  risk_score: number | null;
  reasoning: string | null;
  risk_breakdown: RiskFlag[] | null;
  consumed: boolean | null;
}

export async function createScan(userId: string, healthProfileId: string, imageUrl: string, width: number, height: number): Promise<ScanRow> {
  const rows = await query<ScanRow>(
    `INSERT INTO scans (user_id, health_profile_id, image_url, image_width, image_height, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING *`,
    [userId, healthProfileId, imageUrl, width, height],
  );
  return rows[0];
}

export async function setScanStatus(scanId: string, status: ScanRow["status"], rawDetectionJson?: unknown): Promise<void> {
  await query(`UPDATE scans SET status = $1, raw_detection_json = COALESCE($2, raw_detection_json) WHERE id = $3`, [
    status,
    rawDetectionJson ? JSON.stringify(rawDetectionJson) : null,
    scanId,
  ]);
}

export async function insertScanItem(
  scanId: string,
  detectedLabel: string,
  x: number,
  y: number,
  confidence: number | null,
  match: { nutritionItemId: string | null; matchScore: number | null; matchMethod: string },
  scored: { color: string; riskScore: number; reasoning: string; riskBreakdown: unknown },
): Promise<ScanItemRow> {
  const rows = await query<ScanItemRow>(
    `INSERT INTO scan_items
       (scan_id, detected_label, point_x, point_y, confidence,
        matched_nutrition_item_id, match_score, match_method,
        color, risk_score, reasoning, risk_breakdown)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      scanId,
      detectedLabel,
      x,
      y,
      confidence,
      match.nutritionItemId,
      match.matchScore,
      match.matchMethod,
      scored.color,
      scored.riskScore,
      scored.reasoning,
      JSON.stringify(scored.riskBreakdown),
    ],
  );
  return rows[0];
}

interface ScanSummaryQueryRow {
  id: string;
  image_url: string;
  status: string;
  created_at: string;
  profile_label: string;
  item_count: string;
  avg_risk_score: string | null;
  worst_color_rank: number | null;
}

const COLOR_BY_RANK = ["green", "yellow", "red"] as const;

// Meal history: one row per scan, with item count / average risk / worst
// color aggregated from scan_items so the list view doesn't need a second
// round-trip per scan. "Worst color" mirrors the scoring engine's own
// worst-flag-wins rule (red > yellow > green) via a rank-then-max trick.
export async function listScansForUser(userId: string): Promise<ScanSummaryRow[]> {
  const rows = await query<ScanSummaryQueryRow>(
    `SELECT s.id, s.image_url, s.status, s.created_at, hp.label AS profile_label,
            COUNT(si.id) AS item_count,
            AVG(si.risk_score) AS avg_risk_score,
            MAX(CASE si.color WHEN 'red' THEN 2 WHEN 'yellow' THEN 1 WHEN 'green' THEN 0 ELSE NULL END) AS worst_color_rank
     FROM scans s
     JOIN health_profiles hp ON hp.id = s.health_profile_id
     LEFT JOIN scan_items si ON si.scan_id = s.id
     WHERE s.user_id = $1
     GROUP BY s.id, s.image_url, s.status, s.created_at, hp.label
     ORDER BY s.created_at DESC`,
    [userId],
  );

  return rows.map((r) => ({
    id: r.id,
    image_url: r.image_url,
    status: r.status,
    created_at: r.created_at,
    profile_label: r.profile_label,
    item_count: Number(r.item_count),
    avg_risk_score: r.avg_risk_score == null ? null : Number(r.avg_risk_score),
    worst_color: r.worst_color_rank == null ? null : COLOR_BY_RANK[r.worst_color_rank],
  }));
}

export async function getScanItems(scanId: string): Promise<ScanItemRow[]> {
  return query<ScanItemRow>(`SELECT * FROM scan_items WHERE scan_id = $1 ORDER BY created_at`, [scanId]);
}

export interface ScanItemWithNutritionRow extends ScanItemRow {
  canonical_name: string | null;
  category: string | null;
  glycemic_index: number | null;
  glycemic_load: string | null;
  cholesterol_mg: string | null;
  saturated_fat_g: string | null;
  fat_g: string | null;
  calories_kcal: string | null;
  carbs_g: string | null;
  protein_g: string | null;
  fiber_g: string | null;
  sodium_mg: string | null;
  sugar_g: string | null;
  allergen_tags: string[] | null;
  diet_flags: string[] | null;
  key_nutrients: Record<string, number> | null;
}

// Joins scan_items with their matched nutrition row — used by the rescore
// route, which never calls Bedrock; it only re-runs the local scoring engine.
// Also used by the swap-suggestion route, which needs category (to find
// same-category alternatives) and canonical_name (for display).
export async function getScanItemsWithNutrition(scanId: string): Promise<ScanItemWithNutritionRow[]> {
  return query<ScanItemWithNutritionRow>(
    `SELECT si.*, n.canonical_name, n.category, n.glycemic_index, n.glycemic_load, n.cholesterol_mg,
            n.saturated_fat_g, n.fat_g, n.calories_kcal, n.carbs_g, n.protein_g, n.fiber_g,
            n.sodium_mg, n.sugar_g, n.allergen_tags, n.diet_flags, n.key_nutrients
     FROM scan_items si
     LEFT JOIN nutrition_items n ON n.id = si.matched_nutrition_item_id
     WHERE si.scan_id = $1
     ORDER BY si.created_at`,
    [scanId],
  );
}

export interface FrequentlyEatenItem {
  id: string;
  canonicalName: string;
  category: string | null;
  timesEaten: number;
  nutrition: NutritionRowInput;
}

interface FrequentlyEatenQueryRow {
  id: string;
  canonical_name: string;
  category: string | null;
  times_eaten: string;
  glycemic_index: number | null;
  glycemic_load: string | null;
  cholesterol_mg: string | null;
  saturated_fat_g: string | null;
  fat_g: string | null;
  calories_kcal: string | null;
  carbs_g: string | null;
  protein_g: string | null;
  fiber_g: string | null;
  sodium_mg: string | null;
  sugar_g: string | null;
  allergen_tags: string[];
  diet_flags: string[];
  key_nutrients: Record<string, number>;
}

// The "past eating habits" half of the swap-suggestion feature: which
// confirmed-eaten foods come up most often for this user, most frequent
// first. The caller re-scores each against the live profile rather than
// trusting whatever color was stored historically, since the profile may
// have changed since those scans.
export async function listFrequentlyEatenNutritionItems(userId: string, limit: number): Promise<FrequentlyEatenItem[]> {
  const rows = await query<FrequentlyEatenQueryRow>(
    `SELECT n.id, n.canonical_name, n.category, COUNT(*) AS times_eaten,
            n.glycemic_index, n.glycemic_load, n.cholesterol_mg, n.saturated_fat_g, n.fat_g,
            n.calories_kcal, n.carbs_g, n.protein_g, n.fiber_g, n.sodium_mg, n.sugar_g,
            n.allergen_tags, n.diet_flags, n.key_nutrients
     FROM scan_items si
     JOIN scans s ON s.id = si.scan_id
     JOIN nutrition_items n ON n.id = si.matched_nutrition_item_id
     WHERE s.user_id = $1 AND si.consumed = true
     GROUP BY n.id
     ORDER BY times_eaten DESC
     LIMIT $2`,
    [userId, limit],
  );

  return rows.map((r) => ({
    id: r.id,
    canonicalName: r.canonical_name,
    category: r.category,
    timesEaten: Number(r.times_eaten),
    nutrition: {
      glycemicIndex: r.glycemic_index,
      glycemicLoad: r.glycemic_load == null ? null : Number(r.glycemic_load),
      cholesterolMg: r.cholesterol_mg == null ? null : Number(r.cholesterol_mg),
      saturatedFatG: r.saturated_fat_g == null ? null : Number(r.saturated_fat_g),
      sodiumMg: r.sodium_mg == null ? null : Number(r.sodium_mg),
      sugarG: r.sugar_g == null ? null : Number(r.sugar_g),
      allergenTags: r.allergen_tags ?? [],
      dietFlags: r.diet_flags ?? [],
      keyNutrients: r.key_nutrients ?? {},
      caloriesKcal: r.calories_kcal == null ? null : Number(r.calories_kcal),
      fatG: r.fat_g == null ? null : Number(r.fat_g),
      carbsG: r.carbs_g == null ? null : Number(r.carbs_g),
      proteinG: r.protein_g == null ? null : Number(r.protein_g),
      fiberG: r.fiber_g == null ? null : Number(r.fiber_g),
    },
  }));
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

interface DailyNutritionQueryRow {
  scan_id: string;
  scan_created_at: string;
  detected_label: string;
  canonical_name: string | null;
  calories_kcal: string | null;
  carbs_g: string | null;
  protein_g: string | null;
  fat_g: string | null;
  fiber_g: string | null;
  sugar_g: string | null;
  sodium_mg: string | null;
  cholesterol_mg: string | null;
  key_nutrients: Record<string, number> | null;
}

// Daily nutrition dashboard: every matched, confirmed-eaten scan_item for the
// user on a given UTC calendar day, with the raw per-item nutrition still
// attached so totals (incl. JSONB micronutrients) can be summed in JS rather
// than fighting jsonb_each aggregation in SQL. Unmatched items have no
// nutrition row, and unconfirmed/skipped items have consumed != true — both
// are excluded from totals so the dashboard only reflects what was actually eaten.
export async function listDailyNutritionItems(userId: string, dateStr: string): Promise<DailyNutritionItem[]> {
  const rows = await query<DailyNutritionQueryRow>(
    `SELECT s.id AS scan_id, s.created_at AS scan_created_at, si.detected_label,
            n.canonical_name, n.calories_kcal, n.carbs_g, n.protein_g, n.fat_g,
            n.fiber_g, n.sugar_g, n.sodium_mg, n.cholesterol_mg, n.key_nutrients
     FROM scans s
     JOIN scan_items si ON si.scan_id = s.id
     JOIN nutrition_items n ON n.id = si.matched_nutrition_item_id
     WHERE s.user_id = $1 AND s.created_at::date = $2::date AND si.consumed = true
     ORDER BY s.created_at`,
    [userId, dateStr],
  );

  return rows.map((r) => ({
    scanId: r.scan_id,
    scanCreatedAt: r.scan_created_at,
    detectedLabel: r.detected_label,
    canonicalName: r.canonical_name,
    caloriesKcal: r.calories_kcal == null ? null : Number(r.calories_kcal),
    carbsG: r.carbs_g == null ? null : Number(r.carbs_g),
    proteinG: r.protein_g == null ? null : Number(r.protein_g),
    fatG: r.fat_g == null ? null : Number(r.fat_g),
    fiberG: r.fiber_g == null ? null : Number(r.fiber_g),
    sugarG: r.sugar_g == null ? null : Number(r.sugar_g),
    sodiumMg: r.sodium_mg == null ? null : Number(r.sodium_mg),
    cholesterolMg: r.cholesterol_mg == null ? null : Number(r.cholesterol_mg),
    keyNutrients: r.key_nutrients ?? {},
  }));
}

export interface PendingConsumptionItem {
  id: string;
  scanId: string;
  scanImageUrl: string;
  scanCreatedAt: string;
  detectedLabel: string;
  canonicalName: string | null;
}

interface PendingConsumptionQueryRow {
  id: string;
  scan_id: string;
  scan_image_url: string;
  scan_created_at: string;
  detected_label: string;
  canonical_name: string | null;
}

// "Confirm what you ate" review queue: every detected item the user hasn't
// yet said yes/no to, across all their scans, newest first. Surfaced as a
// banner the next time they open the app — confirming right after the scan
// itself isn't always possible (plans change, they skip the unhealthy item).
export async function listPendingConsumptionItems(userId: string): Promise<PendingConsumptionItem[]> {
  const rows = await query<PendingConsumptionQueryRow>(
    `SELECT si.id, si.scan_id, s.image_url AS scan_image_url, s.created_at AS scan_created_at,
            si.detected_label, n.canonical_name
     FROM scan_items si
     JOIN scans s ON s.id = si.scan_id
     LEFT JOIN nutrition_items n ON n.id = si.matched_nutrition_item_id
     WHERE s.user_id = $1 AND si.consumed IS NULL
     ORDER BY s.created_at DESC`,
    [userId],
  );
  return rows.map((r) => ({
    id: r.id,
    scanId: r.scan_id,
    scanImageUrl: r.scan_image_url,
    scanCreatedAt: r.scan_created_at,
    detectedLabel: r.detected_label,
    canonicalName: r.canonical_name,
  }));
}

// Ownership-checked so one user can't flip another's items via a guessed id.
export async function setScanItemConsumed(scanItemId: string, userId: string, consumed: boolean | null): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `UPDATE scan_items SET consumed = $1
     WHERE id = $2 AND scan_id IN (SELECT id FROM scans WHERE user_id = $3)
     RETURNING id`,
    [consumed, scanItemId, userId],
  );
  return rows.length > 0;
}

export async function updateScanItemScore(
  scanItemId: string,
  scored: { color: string; riskScore: number; reasoning: string; riskBreakdown: unknown },
): Promise<void> {
  await query(
    `UPDATE scan_items SET color = $1, risk_score = $2, reasoning = $3, risk_breakdown = $4 WHERE id = $5`,
    [scored.color, scored.riskScore, scored.reasoning, JSON.stringify(scored.riskBreakdown), scanItemId],
  );
}
