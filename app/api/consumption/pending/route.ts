import { NextResponse } from "next/server";
import { getOrCreateUserId } from "../../../../lib/auth";
import { listPendingConsumptionItems } from "../../../../lib/db/queries/scans";

// Review queue for the "what did you actually eat" banner shown on next visit.
export async function GET() {
  const userId = await getOrCreateUserId();
  const items = await listPendingConsumptionItems(userId);
  return NextResponse.json({ items });
}
