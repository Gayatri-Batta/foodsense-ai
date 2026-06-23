import { query } from "../pool";
import type { ConditionInput, RuleKey, Severity } from "../../scoring/engine";

export interface HealthProfileRow {
  id: string;
  user_id: string;
  label: string;
  is_active: boolean;
}

export interface ConditionCatalogRow {
  id: string;
  code: string | null;
  label: string;
  category: string;
  is_preset: boolean;
  rule_key: RuleKey;
}

export async function listConditionCatalog(): Promise<ConditionCatalogRow[]> {
  return query<ConditionCatalogRow>(`SELECT * FROM conditions WHERE is_preset = true ORDER BY category, label`);
}

export interface ProfileConditionSelection {
  conditionCode?: string; // existing preset condition code
  customLabel?: string; // for a brand-new custom condition
  ruleKey: RuleKey; // required for custom conditions; ignored for presets
  allergenTag?: string;
  severity: Severity;
}

export async function listProfiles(userId: string): Promise<HealthProfileRow[]> {
  return query<HealthProfileRow>(`SELECT * FROM health_profiles WHERE user_id = $1 ORDER BY created_at`, [userId]);
}

async function resolveConditionId(selection: ProfileConditionSelection): Promise<string> {
  if (selection.conditionCode) {
    const rows = await query<{ id: string }>(`SELECT id FROM conditions WHERE code = $1`, [selection.conditionCode]);
    if (rows[0]) return rows[0].id;
  }

  // Custom condition: code stays NULL, is_preset = false.
  const code = selection.allergenTag ? `allergy_${selection.allergenTag}` : null;
  const rows = await query<{ id: string }>(
    `INSERT INTO conditions (code, label, category, is_preset, rule_key)
     VALUES ($1, $2, $3, false, $4)
     RETURNING id`,
    [code, selection.customLabel ?? "Custom condition", selection.ruleKey === "allergen_avoid" ? "allergen" : "lifestyle", selection.ruleKey],
  );
  return rows[0].id;
}

export async function createProfile(
  userId: string,
  label: string,
  conditions: ProfileConditionSelection[],
  makeActive = true,
): Promise<HealthProfileRow> {
  if (makeActive) {
    await query(`UPDATE health_profiles SET is_active = false WHERE user_id = $1`, [userId]);
  }

  const profileRows = await query<HealthProfileRow>(
    `INSERT INTO health_profiles (user_id, label, is_active) VALUES ($1, $2, $3) RETURNING *`,
    [userId, label, makeActive],
  );
  const profile = profileRows[0];

  for (const selection of conditions) {
    const conditionId = await resolveConditionId(selection);
    await query(
      `INSERT INTO health_profile_conditions (health_profile_id, condition_id, custom_label, severity)
       VALUES ($1, $2, $3, $4)`,
      [profile.id, conditionId, selection.conditionCode ? null : selection.customLabel ?? null, selection.severity],
    );
  }

  return profile;
}

export async function getActiveProfile(userId: string): Promise<HealthProfileRow | null> {
  const rows = await query<HealthProfileRow>(
    `SELECT * FROM health_profiles WHERE user_id = $1 AND is_active = true LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function setActiveProfile(userId: string, profileId: string): Promise<void> {
  await query(`UPDATE health_profiles SET is_active = false WHERE user_id = $1`, [userId]);
  await query(`UPDATE health_profiles SET is_active = true WHERE id = $1 AND user_id = $2`, [profileId, userId]);
}

interface ConditionJoinRow {
  rule_key: ConditionInput["ruleKey"];
  severity: Severity;
  allergen_tag: string | null;
}

// Reads the conditions attached to a profile, already shaped as the
// ConditionInput[] the pure scoring engine expects — keeps API routes thin.
export async function getProfileConditions(profileId: string): Promise<ConditionInput[]> {
  const rows = await query<ConditionJoinRow>(
    `SELECT c.rule_key, hpc.severity,
            CASE WHEN c.rule_key = 'allergen_avoid' THEN c.code ELSE NULL END AS allergen_tag
     FROM health_profile_conditions hpc
     JOIN conditions c ON c.id = hpc.condition_id
     WHERE hpc.health_profile_id = $1`,
    [profileId],
  );

  return rows.map((r) => ({
    ruleKey: r.rule_key,
    severity: r.severity,
    allergenTag: r.allergen_tag?.replace("allergy_", "") ?? undefined,
  }));
}
