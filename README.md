# AI-Powered Food Health Analyzer

Upload a food photo, get back per-item health scoring personalized to your conditions (diabetes,
high cholesterol, allergies, etc.) — colored dots overlaid on the image, hover for reasoning,
switch profiles to watch scores update live, and ask follow-up questions in chat.

Built for **H0: Hack the Zero Stack with Vercel v0 and AWS Databases**.

## Stack

- **Frontend:** Next.js (App Router), deployed on Vercel, UI components scaffolded via v0.app.
- **Database:** Aurora PostgreSQL (Serverless v2) + `pgvector`, provisioned through Vercel's AWS
  Databases integration. Connected via plain `pg.Pool` + IAM auth tokens (`@aws-sdk/rds-signer`) —
  not the RDS Data API.
- **AI:** AWS Bedrock (Claude, vision-capable) for food detection from photos and grounded chat;
  Titan Embeddings for pgvector nutrition matching.
- **Image storage:** Vercel Blob.

## Architecture

```
Browser (Next.js on Vercel)
  -> POST /api/scans            (image upload + detect + match + score)
       -> Bedrock Converse (vision, forced tool-use)   -- detected food labels + coords
       -> Bedrock Titan Embeddings + pgvector <=>      -- nutrition match per item
       -> lib/scoring/engine.ts (pure, deterministic)  -- color + reasoning per item
  -> POST /api/scans/[id]/rescore   (profile switch -- no Bedrock call, re-scores in place)
  -> POST /api/scans/[id]/chat      (Bedrock Converse, grounded in scan + profile context)
```

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in Aurora connection details (from the Vercel
   project's environment variables once Aurora is provisioned) and Bedrock model IDs.
3. Apply the schema: `npm run db:migrate`
4. Seed reference data: `npm run seed:conditions` then `npm run seed:nutrition`
   (expand `data/nutrition-seed.json` beyond the ~40 starter items before the final demo).
5. `npm run dev`

## Key files

- `db/schema.sql` — full Aurora/pgvector schema.
- `lib/scoring/engine.ts` — deterministic scoring engine (no AI calls; this is what makes the
  live profile-switch demo instant).
- `lib/ai/detectFoodItems.ts` — Bedrock Converse + forced tool-use food detection.
- `lib/db/queries/nutrition.ts` — pgvector match + alias fallback logic.
- `app/api/scans/[id]/rescore/route.ts` — the no-AI-call "wow" route for live profile switching.
- `data/nutrition-seed.json` — curated nutrition reference dataset.
