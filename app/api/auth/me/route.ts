import { NextResponse } from "next/server";
import { getSessionUserId } from "../../../../lib/auth";
import { findUserById } from "../../../../lib/db/queries/users";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ user: null });

  const user = await findUserById(userId);
  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({ user: { id: user.id, email: user.email } });
}
