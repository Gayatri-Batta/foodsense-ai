// One-time seed: inserts the preset condition catalog from lib/conditions/presets.ts.
// Run with: npm run seed:conditions
import "dotenv/config";
import { getPool } from "../lib/db/pool";
import { CONDITION_PRESETS } from "../lib/conditions/presets";

async function main() {
  const pool = getPool();
  for (const preset of CONDITION_PRESETS) {
    await pool.query(
      `INSERT INTO conditions (code, label, category, is_preset, rule_key)
       VALUES ($1, $2, $3, true, $4)
       ON CONFLICT (code) DO UPDATE SET label = $2, category = $3, rule_key = $4`,
      [preset.code, preset.label, preset.category, preset.ruleKey],
    );
    console.log(`Seeded condition: ${preset.code}`);
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
