import { NextRequest, NextResponse } from "next/server";
import { getPool } from "../../../../lib/db/pool";
import { CONDITION_PRESETS } from "../../../../lib/conditions/presets";
import { embedText } from "../../../../lib/ai/embedText";
import nutritionSeed from "../../../../data/nutrition-seed.json";

interface SeedRow {
  canonicalName: string;
  aliases: string[];
  category: string;
  glycemicIndex: number | null;
  glycemicLoad?: number | null;
  cholesterolMg: number | null;
  saturatedFatG: number | null;
  fatG?: number | null;
  caloriesKcal?: number | null;
  sodiumMg: number | null;
  sugarG: number | null;
  carbsG: number | null;
  proteinG: number | null;
  fiberG: number | null;
  allergenTags: string[];
  dietFlags: string[];
  keyNutrients?: Record<string, number>;
  servingDesc: string;
}

// Same reasoning as /api/admin/migrate: this has to run inside the Vercel
// deployment, since that's the only place the Aurora connection actually
// authenticates. Seeds the condition catalog (cheap) then the curated
// nutrition dataset with one Bedrock embedding call per row.
//
// ~40 sequential Bedrock embedding calls can take a while; extend the
// function timeout so the request doesn't get cut off mid-seed.
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-secret") !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const pool = getPool();

  for (const preset of CONDITION_PRESETS) {
    await pool.query(
      `INSERT INTO conditions (code, label, category, is_preset, rule_key)
       VALUES ($1, $2, $3, true, $4)
       ON CONFLICT (code) DO UPDATE SET label = $2, category = $3, rule_key = $4`,
      [preset.code, preset.label, preset.category, preset.ruleKey],
    );
  }

  const rows = nutritionSeed as SeedRow[];
  let nutritionSeeded = 0;
  for (const row of rows) {
    const embedding = await embedText(`${row.canonicalName} (${row.aliases.join(", ")})`);
    const vectorLiteral = `[${embedding.join(",")}]`;

    await pool.query(
      `INSERT INTO nutrition_items
         (canonical_name, aliases, category, embedding, glycemic_index, glycemic_load,
          cholesterol_mg, saturated_fat_g, fat_g, calories_kcal, sodium_mg, sugar_g, carbs_g,
          protein_g, fiber_g, allergen_tags, diet_flags, key_nutrients, serving_desc)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       ON CONFLICT (canonical_name) DO UPDATE SET
         aliases = $2, category = $3, embedding = $4, glycemic_index = $5, glycemic_load = $6,
         cholesterol_mg = $7, saturated_fat_g = $8, fat_g = $9, calories_kcal = $10, sodium_mg = $11,
         sugar_g = $12, carbs_g = $13, protein_g = $14, fiber_g = $15, allergen_tags = $16,
         diet_flags = $17, key_nutrients = $18, serving_desc = $19`,
      [
        row.canonicalName,
        row.aliases,
        row.category,
        vectorLiteral,
        row.glycemicIndex,
        row.glycemicLoad ?? null,
        row.cholesterolMg,
        row.saturatedFatG,
        row.fatG ?? null,
        row.caloriesKcal ?? null,
        row.sodiumMg,
        row.sugarG,
        row.carbsG,
        row.proteinG,
        row.fiberG,
        row.allergenTags,
        row.dietFlags,
        JSON.stringify(row.keyNutrients ?? {}),
        row.servingDesc,
      ],
    );
    nutritionSeeded++;
  }

  return NextResponse.json({ ok: true, conditionsSeeded: CONDITION_PRESETS.length, nutritionSeeded });
}
