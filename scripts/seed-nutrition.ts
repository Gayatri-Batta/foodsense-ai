// One-time seed: inserts the curated nutrition dataset (data/nutrition-seed.json)
// and computes+stores a Bedrock embedding per row for pgvector matching.
// Run with: npm run seed:nutrition
//
// Starter set is ~40 common plate items. Per the build plan, expand this to
// 60-100 rows on Day 2 (pull real values from USDA FoodData Central) so
// whatever you photograph for the demo has a confident match.
import "dotenv/config";
import fs from "fs";
import path from "path";
import { getPool } from "../lib/db/pool";
import { embedText } from "../lib/ai/embedText";

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

async function main() {
  const filePath = path.join(__dirname, "..", "data", "nutrition-seed.json");
  const rows: SeedRow[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const pool = getPool();

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
    console.log(`Seeded nutrition item: ${row.canonicalName}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
