import { NextResponse } from "next/server";
import { getOrCreateUserId } from "../../../../../lib/auth";
import { setActiveProfile } from "../../../../../lib/db/queries/profiles";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getOrCreateUserId();
  await setActiveProfile(userId, id);
  return NextResponse.json({ ok: true });
}
