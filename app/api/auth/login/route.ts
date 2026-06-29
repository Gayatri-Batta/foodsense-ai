import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, setSessionCookie } from "../../../../lib/auth";
import { findUserByEmail } from "../../../../lib/db/queries/users";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const user = await findUserByEmail(email);
  if (!user?.password_hash || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  await setSessionCookie(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email } });
}
