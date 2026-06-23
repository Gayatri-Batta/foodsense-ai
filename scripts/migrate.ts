// Applies db/schema.sql against the provisioned Aurora cluster.
// Run with: npm run db:migrate
import "dotenv/config";
import fs from "fs";
import path from "path";
import { getPool } from "../lib/db/pool";

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, "..", "db", "schema.sql"), "utf-8");
  const pool = getPool();
  await pool.query(sql);
  console.log("Schema applied.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
