// Aurora PostgreSQL connection, per Vercel's AWS Databases integration:
// the integration injects PGHOST/PGPORT/PGUSER/PGDATABASE + an OIDC-federated
// AWS role, and auth happens via short-lived RDS IAM tokens — NOT the RDS
// Data API. Plain `pg.Pool` + raw SQL, so pgvector operators work directly.
import { Pool } from "pg";
import { Signer } from "@aws-sdk/rds-signer";

let pool: Pool | null = null;

async function getAuthToken(): Promise<string> {
  const signer = new Signer({
    region: process.env.AWS_REGION ?? "us-east-1",
    hostname: process.env.PGHOST!,
    port: Number(process.env.PGPORT ?? 5432),
    username: process.env.PGUSER!,
  });
  return signer.getAuthToken();
}

export function getPool(): Pool {
  if (pool) return pool;

  pool = new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER,
    database: process.env.PGDATABASE,
    ssl: { rejectUnauthorized: true },
    // IAM auth tokens are short-lived (~15 min); mint a fresh one per new connection.
    password: process.env.PGPASSWORD ? undefined : getAuthToken,
    ...(process.env.PGPASSWORD ? { password: process.env.PGPASSWORD } : {}),
    max: 5,
  });

  return pool;
}

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const client = getPool();
  const result = await client.query(text, params);
  return result.rows as T[];
}
