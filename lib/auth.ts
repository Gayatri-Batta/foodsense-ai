// No auth system for the hackathon demo — each browser gets an anonymous
// user row, identified by a cookie. Swap for real auth post-hackathon
// without touching any of the scoring/scan/chat logic, which only depends
// on a userId string.
import { cookies } from "next/headers";
import { query } from "./db/pool";

const COOKIE_NAME = "fha_uid";

interface UserRow {
  id: string;
}

export async function getOrCreateUserId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const rows = await query<UserRow>(`INSERT INTO users DEFAULT VALUES RETURNING id`);
  const userId = rows[0].id;

  cookieStore.set(COOKIE_NAME, userId, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return userId;
}
