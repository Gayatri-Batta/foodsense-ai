import { NextRequest, NextResponse } from "next/server";
import { getPool } from "../../../../lib/db/pool";

// One-time cleanup for launch: wipes the demo/test health profiles (and
// everything that hangs off them -- scans, scan items, chat) built up while
// developing, so real accounts start from a clean slate. Does NOT touch
// users (real accounts stay) or the nutrition_items/conditions catalogs
// (reference data, not user data). Unlike /api/admin/migrate, this is not
// meant to be re-run routinely -- it's destructive every time it's called.
async function run(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Extra confirm flag on the GET path so an accidental link click/prefetch
  // can't trigger a destructive truncate just by being visited.
  if (req.method === "GET" && req.nextUrl.searchParams.get("confirm") !== "yes") {
    return NextResponse.json({ error: "add &confirm=yes to the URL to actually run this" }, { status: 400 });
  }

  const pool = getPool();
  await pool.query(
    `TRUNCATE TABLE chat_messages, scan_items, scans, health_profile_conditions, health_profiles RESTART IDENTITY CASCADE`,
  );

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
