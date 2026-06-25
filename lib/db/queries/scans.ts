import { query } from "../pool";
import type { RiskFlag } from "../../scoring/engine";

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

interface ScanItemWithNutritionRow extends ScanItemRow {
  glycemic_index: number | null;
  glycemic_load: string | null;
  cholesterol_mg: string | null;
  saturated_fat_g: string | null;
  sodium_mg: string | null;
  sugar_g: string | null;
  allergen_tags: string[] | null;
  diet_flags: string[] | null;
  key_nutrients: Record<string, number> | null;
}

// Joins scan_items with their matched nutrition row — used by the rescore
// route, which never calls Bedrock; it only re-runs the local scoring engine.
export async function getScanItemsWithNutrition(scanId: string): Promise<ScanItemWithNutritionRow[]> {
  return query<ScanItemWithNutritionRow>(
    `SELECT si.*, n.glycemic_index, n.glycemic_load, n.cholesterol_mg, n.saturated_fat_g,
            n.sodium_mg, n.sugar_g, n.allergen_tags, n.diet_flags, n.key_nutrients
     FROM scan_items si
     LEFT JOIN nutrition_items n ON n.id = si.matched_nutrition_item_id
     WHERE si.scan_id = $1
     ORDER BY si.created_at`,
    [scanId],
  );
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
