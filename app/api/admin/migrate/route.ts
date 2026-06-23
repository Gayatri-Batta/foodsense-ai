import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getPool } from "../../../../lib/db/pool";

// Vercel's Aurora integration only authenticates via OIDC federation inside a
// running Vercel function -- there's no local AWS credential path to this
// cluster, since it lives in Vercel's own AWS account. So schema migration
// has to run from inside the deployment, behind a shared-secret check.
export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-secret") !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sql = fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf-8");
  const pool = getPool();
  await pool.query(sql);

  return NextResponse.json({ ok: true });
}
