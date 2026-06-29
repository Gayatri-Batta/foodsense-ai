import { NextRequest, NextResponse } from "next/server";
import { hashPassword, setSessionCookie, getAnonymousUserId } from "../../../../lib/auth";
import { claimOrCreateAccount, findUserByEmail } from "../../../../lib/db/queries/users";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists. Log in instead." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const anonymousUserId = await getAnonymousUserId();
  const userId = await claimOrCreateAccount(email, passwordHash, anonymousUserId);

  await setSessionCookie(userId);
  return NextResponse.json({ user: { id: userId, email } });
}
