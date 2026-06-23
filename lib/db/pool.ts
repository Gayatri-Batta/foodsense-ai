// Aurora PostgreSQL connection, per Vercel's official AWS Databases
// integration guide: the integration injects PGHOST/PGPORT/PGUSER/PGDATABASE
// plus an OIDC-federated AWS role (AWS_ROLE_ARN/AWS_REGION), and auth happens
// via short-lived RDS IAM tokens — NOT the RDS Data API. Plain `pg.Pool` +
// raw SQL, so pgvector operators work directly.
//
// In production on Vercel, AWS credentials for the Signer come from
// `awsCredentialsProvider` (Vercel's OIDC federation helper) — without this,
// the Signer has no credentials to sign the auth token request with.
// For local script runs (migrate/seed), there's no OIDC token available, so
// set PGPASSWORD to a manually generated token instead:
//   aws rds generate-db-auth-token --hostname $PGHOST --port $PGPORT --username $PGUSER --region $AWS_REGION
import { Pool } from "pg";
import { Signer } from "@aws-sdk/rds-signer";
import { awsCredentialsProvider } from "@vercel/functions/oidc";
import { attachDatabasePool } from "@vercel/functions";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;

  const usingStaticPassword = Boolean(process.env.PGPASSWORD);

  const signer = usingStaticPassword
    ? null
    : new Signer({
        hostname: process.env.PGHOST!,
        port: Number(process.env.PGPORT ?? 5432),
        username: process.env.PGUSER!,
        region: process.env.AWS_REGION ?? "us-east-1",
        credentials: awsCredentialsProvider({
          roleArn: process.env.AWS_ROLE_ARN!,
          clientConfig: { region: process.env.AWS_REGION ?? "us-east-1" },
        }),
      });

  pool = new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER,
    database: process.env.PGDATABASE || "postgres",
    // IAM auth tokens are short-lived (~15 min); mint a fresh one per new connection.
    password: usingStaticPassword ? process.env.PGPASSWORD : () => signer!.getAuthToken(),
    // Matches Vercel's own quickstart default. Tighten to true + a proper RDS CA
    // bundle before relying on this in a non-hackathon production setting.
    ssl: { rejectUnauthorized: false },
    max: 5,
  });

  attachDatabasePool(pool);

  return pool;
}

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const client = getPool();
  const result = await client.query(text, params);
  return result.rows as T[];
}
