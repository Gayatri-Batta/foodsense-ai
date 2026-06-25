import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUserId } from "../../../../../lib/auth";
import { setScanItemConsumed } from "../../../../../lib/db/queries/scans";

// Marks a single detected item as eaten (true), skipped (false), or back to
// pending (null) — the undo case covers a user changing their mind. Ownership
// is checked in the query itself, not here, so a guessed item id from another
// user's scan can't be flipped.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getOrCreateUserId();
  const body = await req.json().catch(() => ({}));
  const consumed = body.consumed;

  if (consumed !== true && consumed !== false && consumed !== null) {
    return NextResponse.json({ error: "consumed must be true, false, or null" }, { status: 400 });
  }

  const updated = await setScanItemConsumed(id, userId, consumed);
  if (!updated) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
