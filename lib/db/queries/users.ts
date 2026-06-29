import { query } from "../pool";

export interface UserAccountRow {
  id: string;
  email: string | null;
  password_hash: string | null;
}

export async function findUserByEmail(email: string): Promise<UserAccountRow | null> {
  const rows = await query<UserAccountRow>(`SELECT id, email, password_hash FROM users WHERE email = $1`, [email]);
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserAccountRow | null> {
  const rows = await query<UserAccountRow>(`SELECT id, email, password_hash FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

// Claims the caller's existing anonymous row instead of creating a new one
// whenever possible, so any profiles/scans/history made before signing up
// stay attached to the account instead of being orphaned under a dead
// anonymous id. Falls back to a fresh row if there's no anonymous id, or it
// turns out to already be a real (non-anonymous) account.
export async function claimOrCreateAccount(
  email: string,
  passwordHash: string,
  anonymousUserId: string | null,
): Promise<string> {
  if (anonymousUserId) {
    const rows = await query<{ id: string }>(
      `UPDATE users SET email = $1, password_hash = $2 WHERE id = $3 AND email IS NULL RETURNING id`,
      [email, passwordHash, anonymousUserId],
    );
    if (rows[0]) return rows[0].id;
  }

  const rows = await query<{ id: string }>(`INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`, [
    email,
    passwordHash,
  ]);
  return rows[0].id;
}
