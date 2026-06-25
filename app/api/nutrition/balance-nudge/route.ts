import { NextResponse } from "next/server";
import { getOrCreateUserId } from "../../../../lib/auth";
import { listDailyTotalsSince } from "../../../../lib/db/queries/scans";
import { findBalanceNudge } from "../../../../lib/nutrition/balanceNudge";

const HISTORY_WINDOW_DAYS = 14;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function sinceIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

// Occasional dashboard nudge: compares today's confirmed totals against the
// user's own recent average rather than a generic calorie target. Stays
// quiet unless something is genuinely unusual, or there isn't enough recent
// history yet to know what "usual" looks like for this user.
export async function GET() {
  const userId = await getOrCreateUserId();
  const rows = await listDailyTotalsSince(userId, sinceIso(HISTORY_WINDOW_DAYS));

  const today = todayUtc();
  const todayRow = rows.find((r) => r.date === today);
  const history = rows.filter((r) => r.date !== today);

  if (!todayRow) {
    return NextResponse.json({ nudge: null });
  }

  const nudge = findBalanceNudge(todayRow.totals, history);
  return NextResponse.json({ nudge: nudge?.message ?? null });
}
