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
  sodiumMg: number | null;
  sugarG: number | null;
  carbsG: number | null;
  proteinG: number | null;
  fiberG: number | null;
  allergenTags: string[];
  dietFlags: string[];
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
          cholesterol_mg, saturated_fat_g, sodium_mg, sugar_g, carbs_g, protein_g, fiber_g,
          allergen_tags, diet_flags, serving_desc)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        row.canonicalName,
        row.aliases,
        row.category,
        vectorLiteral,
        row.glycemicIndex,
        row.glycemicLoad ?? null,
        row.cholesterolMg,
        row.saturatedFatG,
        row.sodiumMg,
        row.sugarG,
        row.carbsG,
        row.proteinG,
        row.fiberG,
        row.allergenTags,
        row.dietFlags,
        row.servingDesc,
      ],
    );
    nutritionSeeded++;
  }

  return NextResponse.json({ ok: true, conditionsSeeded: CONDITION_PRESETS.length, nutritionSeeded });
}
