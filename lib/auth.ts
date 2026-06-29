// Anonymous-cookie identity was the hackathon-demo bootstrap: each browser
// got its own user row, no login required. This adds real accounts (email +
// password, usable from any device) on top without touching any of the
// scoring/scan/chat logic downstream, which only depends on a userId string.
// getOrCreateUserId() keeps its exact signature and behavior for callers
// that don't care which kind of identity they got -- it just now prefers a
// signed-in session over the per-browser anonymous id when one exists.
import { cookies } from "next/headers";
import crypto from "crypto";
import { query } from "./db/pool";

const ANON_COOKIE = "fha_uid";
const SESSION_COOKIE = "fha_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSessionSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function createSessionToken(userId: string): string {
  const payload = JSON.stringify({ userId, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS });
  const encodedPayload = Buffer.from(payload).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function verifySessionToken(token: string): { userId: string } | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf-8"));
    if (typeof payload.userId !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt.toString("hex")}:${derivedKey.toString("hex")}`);
    });
  });
}

export function verifyPassword(password: string, stored: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [saltHex, hashHex] = stored.split(":");
    if (!saltHex || !hashHex) return resolve(false);
    crypto.scrypt(password, Buffer.from(saltHex, "hex"), 64, (err, derivedKey) => {
      if (err) return reject(err);
      const storedHash = Buffer.from(hashHex, "hex");
      resolve(storedHash.length === derivedKey.length && crypto.timingSafeEqual(storedHash, derivedKey));
    });
  });
}

interface NewUserRow {
  id: string;
}

export async function getOrCreateUserId(): Promise<string> {
  const cookieStore = await cookies();

  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionToken) {
    const session = verifySessionToken(sessionToken);
    if (session) return session.userId;
  }

  const existing = cookieStore.get(ANON_COOKIE)?.value;
  if (existing) return existing;

  const rows = await query<NewUserRow>(`INSERT INTO users DEFAULT VALUES RETURNING id`);
  const userId = rows[0].id;

  cookieStore.set(ANON_COOKIE, userId, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return userId;
}

// Distinct from getOrCreateUserId(): returns null instead of falling back to
// an anonymous id, so callers (the /api/auth/* routes, the account menu) can
// tell "signed in" apart from "anonymous browsing."
export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return null;
  return verifySessionToken(sessionToken)?.userId ?? null;
}

export async function getAnonymousUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ANON_COOKIE)?.value ?? null;
}

export async function setSessionCookie(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(ANON_COOKIE);
}
