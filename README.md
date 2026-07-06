# FoodSense AI

FoodSense AI analyzes photos of meals and scores each food item against your personal health conditions. Upload a photo of your plate, select your conditions such as diabetes, high cholesterol, or food allergies, and get a color-coded breakdown of every detected ingredient.

Live app: [foodsense-ai-gamma.vercel.app](https://foodsense-ai-gamma.vercel.app)

## Features

- Food detection from meal photos using AI vision
- Per-item health scoring with color indicators (safe, caution, avoid) and reasoning
- Health profiles supporting multiple conditions per user
- Live profile switching that rescores items without making another AI call
- Follow-up chat grounded in your actual scan results, not generic advice
- Fridge scan mode that detects ingredients and suggests recipes
- Consumption tracker for confirming what you actually ate from a scan
- Email and password accounts that work across devices

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS v4 |
| Database | Aurora PostgreSQL Serverless v2 with pgvector |
| AI | AWS Bedrock: Claude for vision and chat, Titan Embeddings for food matching |
| Auth | HMAC-signed session cookies with scrypt password hashing |
| Image storage | Vercel Blob |
| Deployment | Vercel |

## How It Works

When you upload a photo, the app sends it to Claude on Bedrock using forced tool use to extract food labels and approximate coordinates. Each label is embedded with Titan Embeddings and matched against a curated nutrition database using pgvector cosine similarity. A deterministic scoring engine then applies your active health profile rules to assign a risk color and reasoning for each item.

Profile switching is instant because the rescore route only reruns the scoring engine against already-stored nutrition data. No AI call is made.

For chat, the full scan context including detected items, risk colors, reasoning, and your active health conditions is assembled into the system prompt. Answers are specific to your scan rather than general nutrition information.

Food items that do not match anything in the database are sent to Claude for a structured nutrition estimate, which is then cached for future scans.

## Local Setup

**Prerequisites:** Node.js 18 or later, an Aurora PostgreSQL cluster with pgvector enabled, and AWS credentials with Bedrock access.

**1. Install dependencies**

```bash
npm install
```

**2. Configure environment variables**

Copy `.env.local.example` to `.env.local` and fill in the values described in the Environment Variables section below.

**3. Apply the database schema**

```bash
npm run db:migrate
```

**4. Seed reference data**

```bash
npm run seed:conditions
npm run seed:nutrition
```

**5. Start the development server**

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

Note: the Aurora cluster is only reachable from inside a deployed Vercel function via OIDC federation. For local development, generate a short-lived IAM auth token with the AWS CLI and set it as `PGPASSWORD` in `.env.local`.

```bash
aws rds generate-db-auth-token \
  --hostname $PGHOST \
  --port 5432 \
  --username postgres \
  --region us-east-1
```

## Project Structure

```
app/
  api/              API routes (scans, profiles, auth, assistant, fridge, admin)
  scan/[scanId]/    Scan result view with dot overlay, tooltips, and chat
  history/          Past scans
  dashboard/        Health analytics
  fridge/           Fridge scan and recipe suggestions
  profiles/         Health profile management
  signup/ login/    Account creation and sign-in pages

components/         Shared UI components

lib/
  ai/               Bedrock integrations (detection, embeddings, chat, nutrition estimation)
  db/               Database pool and query functions per table
  scoring/          Deterministic health scoring engine and thresholds

db/
  schema.sql        Full database schema including pgvector indexes

scripts/            Seed scripts for conditions and nutrition reference data
```

## Environment Variables

| Variable | Description |
|---|---|
| PGHOST, PGPORT, PGUSER, PGDATABASE | Aurora PostgreSQL connection |
| AWS_ACCOUNT_ID, AWS_REGION, AWS_RESOURCE_ARN, AWS_ROLE_ARN | IAM and OIDC config for Aurora auth |
| PGPASSWORD | Short-lived IAM token for local development only |
| BEDROCK_REGION, BEDROCK_MODEL_ID | AWS region and Claude model ID |
| BEDROCK_EMBED_MODEL_ID | Titan Embeddings model ID |
| AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY | IAM credentials for Bedrock (separate from Aurora) |
| BLOB_READ_WRITE_TOKEN | Vercel Blob token for image storage |
| AUTH_SECRET | Secret used to sign session cookies, must be consistent across deployments |
| ADMIN_SECRET | Protects the schema migration and data reset admin endpoints |

## Admin Endpoints

These endpoints are for managing the deployment and are protected by the `ADMIN_SECRET` value. They can be triggered by visiting the URL directly in a browser.

- `/api/admin/migrate?secret=...` applies the latest schema from `db/schema.sql`
- `/api/admin/reset-profiles?secret=...&confirm=yes` removes all profile, scan, and chat data without touching user accounts or the nutrition catalog
