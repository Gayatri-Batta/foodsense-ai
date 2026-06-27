import { query } from "../pool";
import { embedText } from "../../ai/embedText";
import { estimateNutrition, type NutritionEstimate } from "../../ai/estimateNutrition";
import {
  VECTOR_MATCH_ACCEPT_SIMILARITY,
  VECTOR_MATCH_APPROXIMATE_SIMILARITY,
} from "../../scoring/thresholds";
import type { NutritionRowInput } from "../../scoring/engine";

export interface NutritionMatchRow extends NutritionRowInput {
  id: string;
  canonicalName: string;
  aliases: string[];
  similarity: number;
}

export type MatchMethod = "vector" | "alias_exact" | "ai_estimated" | "unmatched";

export interface NutritionMatchResult {
  nutritionItemId: string | null;
  matchScore: number | null;
  matchMethod: MatchMethod;
  nutrition: NutritionRowInput | null;
}

interface NutritionItemRow {
  id: string;
  canonical_name: string;
  aliases: string[];
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
  similarity: number;
}

function toNutritionRowInput(row: NutritionItemRow): NutritionRowInput {
  return {
    glycemicIndex: row.glycemic_index,
    glycemicLoad: row.glycemic_load == null ? null : Number(row.glycemic_load),
    cholesterolMg: row.cholesterol_mg == null ? null : Number(row.cholesterol_mg),
    saturatedFatG: row.saturated_fat_g == null ? null : Number(row.saturated_fat_g),
    sodiumMg: row.sodium_mg == null ? null : Number(row.sodium_mg),
    sugarG: row.sugar_g == null ? null : Number(row.sugar_g),
    allergenTags: row.allergen_tags ?? [],
    dietFlags: row.diet_flags ?? [],
    keyNutrients: row.key_nutrients ?? {},
    caloriesKcal: row.calories_kcal == null ? null : Number(row.calories_kcal),
    fatG: row.fat_g == null ? null : Number(row.fat_g),
    carbsG: row.carbs_g == null ? null : Number(row.carbs_g),
    proteinG: row.protein_g == null ? null : Number(row.protein_g),
    fiberG: row.fiber_g == null ? null : Number(row.fiber_g),
  };
}

// Embeds the AI-detected label and finds the closest curated nutrition_items
// row via pgvector cosine distance, with explicit fallback tiers so the
// match decision is auditable (stored on scan_items.match_method/match_score).
export async function matchNutritionItem(detectedLabel: string): Promise<NutritionMatchResult> {
  const embedding = await embedText(detectedLabel);
  const vectorLiteral = `[${embedding.join(",")}]`;

  const rows = await query<NutritionItemRow>(
    `SELECT id, canonical_name, aliases, glycemic_index, glycemic_load, cholesterol_mg,
            saturated_fat_g, fat_g, calories_kcal, carbs_g, protein_g, fiber_g,
            sodium_mg, sugar_g, allergen_tags, diet_flags, key_nutrients,
            1 - (embedding <=> $1) AS similarity
     FROM nutrition_items
     ORDER BY embedding <=> $1
     LIMIT 5`,
    [vectorLiteral],
  );

  const top = rows[0];

  if (top && top.similarity >= VECTOR_MATCH_ACCEPT_SIMILARITY) {
    return {
      nutritionItemId: top.id,
      matchScore: top.similarity,
      matchMethod: "vector",
      nutrition: toNutritionRowInput(top),
    };
  }

  const lowerLabel = detectedLabel.toLowerCase();
  const aliasHit = rows.find(
    (r) =>
      r.canonical_name.toLowerCase().includes(lowerLabel) ||
      lowerLabel.includes(r.canonical_name.toLowerCase()) ||
      (r.aliases ?? []).some((a) => a.toLowerCase() === lowerLabel || lowerLabel.includes(a.toLowerCase())),
  );
  if (aliasHit) {
    return {
      nutritionItemId: aliasHit.id,
      matchScore: aliasHit.similarity,
      matchMethod: "alias_exact",
      nutrition: toNutritionRowInput(aliasHit),
    };
  }

  if (top && top.similarity >= VECTOR_MATCH_APPROXIMATE_SIMILARITY) {
    return {
      nutritionItemId: top.id,
      matchScore: top.similarity,
      matchMethod: "vector",
      nutrition: toNutritionRowInput(top),
    };
  }

  // No confident catalog match. Rather than giving up with a vague "couldn't
  // identify this" yellow flag, ask the model already running the rest of
  // the pipeline for a best-effort estimate, then cache it into the catalog
  // (same embedding already computed above, no extra embed call) so the
  // next time this food comes up it's a normal vector match.
  try {
    const estimate = await estimateNutrition(detectedLabel);
    if (estimate) {
      const estimatedId = await upsertEstimatedNutritionItem(estimate, vectorLiteral);
      return {
        nutritionItemId: estimatedId,
        matchScore: null,
        matchMethod: "ai_estimated",
        nutrition: {
          glycemicIndex: estimate.glycemicIndex,
          glycemicLoad: estimate.glycemicLoad,
          cholesterolMg: estimate.cholesterolMg,
          saturatedFatG: estimate.saturatedFatG,
          sodiumMg: estimate.sodiumMg,
          sugarG: estimate.sugarG,
          allergenTags: estimate.allergenTags,
          dietFlags: estimate.dietFlags,
          keyNutrients: {},
          caloriesKcal: estimate.caloriesKcal,
          fatG: estimate.fatG,
          carbsG: estimate.carbsG,
          proteinG: estimate.proteinG,
          fiberG: estimate.fiberG,
        },
      };
    }
  } catch {
    // Model estimate failed (throttled, malformed response, etc.) — fall
    // through to the same "unmatched" outcome as before rather than failing
    // the whole scan over a best-effort enhancement.
  }

  return { nutritionItemId: null, matchScore: top?.similarity ?? null, matchMethod: "unmatched", nutrition: null };
}

// Inserts an AI-estimated row into the catalog (or, if a row with that exact
// canonical name already exists, refreshes its embedding) so repeat
// detections of the same food hit the normal vector-match tier next time
// instead of re-estimating from scratch.
async function upsertEstimatedNutritionItem(estimate: NutritionEstimate, vectorLiteral: string): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO nutrition_items
       (canonical_name, aliases, category, embedding, glycemic_index, glycemic_load,
        cholesterol_mg, saturated_fat_g, fat_g, calories_kcal, carbs_g, protein_g, fiber_g,
        sodium_mg, sugar_g, allergen_tags, diet_flags, serving_desc, source)
     VALUES ($1, '{}', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'ai_estimated')
     ON CONFLICT (canonical_name) DO UPDATE SET embedding = EXCLUDED.embedding
     RETURNING id`,
    [
      estimate.canonicalName,
      estimate.category,
      vectorLiteral,
      estimate.glycemicIndex,
      estimate.glycemicLoad,
      estimate.cholesterolMg,
      estimate.saturatedFatG,
      estimate.fatG,
      estimate.caloriesKcal,
      estimate.carbsG,
      estimate.proteinG,
      estimate.fiberG,
      estimate.sodiumMg,
      estimate.sugarG,
      estimate.allergenTags,
      estimate.dietFlags,
      estimate.servingDesc,
    ],
  );
  return rows[0].id;
}

export interface NutritionCandidate {
  id: string;
  canonicalName: string;
  nutrition: NutritionRowInput;
}

// Swap candidates: every other curated item in the same food category, so a
// suggested alternative is always something you'd plausibly reach for in
// place of the original (a dairy swap for a dairy item, not a steak swap for
// sour cream). The caller scores each candidate against the live profile
// before suggesting anything, so only real, current improvements surface.
export async function listNutritionItemsByCategory(category: string, excludeId: string): Promise<NutritionCandidate[]> {
  const rows = await query<NutritionItemRow>(
    `SELECT id, canonical_name, aliases, glycemic_index, glycemic_load, cholesterol_mg,
            saturated_fat_g, fat_g, calories_kcal, carbs_g, protein_g, fiber_g,
            sodium_mg, sugar_g, allergen_tags, diet_flags, key_nutrients, 0 AS similarity
     FROM nutrition_items
     WHERE category = $1 AND id != $2`,
    [category, excludeId],
  );
  return rows.map((r) => ({ id: r.id, canonicalName: r.canonical_name, nutrition: toNutritionRowInput(r) }));
}
