import { query } from "../pool";
import { embedText } from "../../ai/embedText";
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

export type MatchMethod = "vector" | "alias_exact" | "unmatched";

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
            saturated_fat_g, sodium_mg, sugar_g, allergen_tags, diet_flags, key_nutrients,
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

  return { nutritionItemId: null, matchScore: top?.similarity ?? null, matchMethod: "unmatched", nutrition: null };
}
