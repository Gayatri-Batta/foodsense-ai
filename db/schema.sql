-- AI-Powered Food Health Analyzer
-- Aurora PostgreSQL + pgvector schema.
-- Apply once against the provisioned Aurora cluster:
--   psql "$DATABASE_URL" -f db/schema.sql

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ USERS ============
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ HEALTH PROFILES ============
CREATE TABLE IF NOT EXISTS health_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_profile_per_user
  ON health_profiles (user_id) WHERE is_active;

-- Canonical condition catalog (presets). Custom conditions reuse this table
-- with is_preset = false; the free-text label lives on health_profile_conditions.custom_label.
CREATE TABLE IF NOT EXISTS conditions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE,                  -- 'diabetes_t2', 'high_cholesterol', 'vegan', 'allergy_peanut', NULL for custom
  label TEXT NOT NULL,
  category TEXT NOT NULL,            -- 'metabolic' | 'cardiac' | 'allergen' | 'lifestyle'
  is_preset BOOLEAN NOT NULL DEFAULT true,
  rule_key TEXT NOT NULL             -- maps to a case in the scoring engine
);

-- Many-to-many: a profile has N conditions (presets and/or custom).
CREATE TABLE IF NOT EXISTS health_profile_conditions (
  health_profile_id UUID NOT NULL REFERENCES health_profiles(id) ON DELETE CASCADE,
  condition_id UUID NOT NULL REFERENCES conditions(id) ON DELETE CASCADE,
  custom_label TEXT,
  severity TEXT NOT NULL DEFAULT 'moderate', -- 'mild' | 'moderate' | 'severe'
  PRIMARY KEY (health_profile_id, condition_id)
);

-- ============ NUTRITION REFERENCE (curated, seeded once) ============
CREATE TABLE IF NOT EXISTS nutrition_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  category TEXT,                      -- 'protein' | 'grain' | 'vegetable' | 'dairy' | 'dessert' ...
  embedding vector(1024),             -- dim matches BEDROCK_EMBED_MODEL_ID (Titan Embed v2 = 1024)
  glycemic_index INT,
  glycemic_load NUMERIC,
  cholesterol_mg NUMERIC,
  saturated_fat_g NUMERIC,
  sodium_mg NUMERIC,
  sugar_g NUMERIC,
  carbs_g NUMERIC,
  protein_g NUMERIC,
  fiber_g NUMERIC,
  calories_kcal NUMERIC,
  fat_g NUMERIC,                              -- total fat per serving (saturated_fat_g is a subset)
  allergen_tags TEXT[] NOT NULL DEFAULT '{}',
  diet_flags TEXT[] NOT NULL DEFAULT '{}',   -- 'vegan_unsafe' | 'vegetarian_safe' | 'keto_unsafe' ...
  key_nutrients JSONB NOT NULL DEFAULT '{}', -- escape hatch, e.g. {"potassium_mg": 350}
  serving_desc TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Added after the initial table was already live in production; ADD COLUMN
-- IF NOT EXISTS makes re-running this file against an existing DB safe.
ALTER TABLE nutrition_items ADD COLUMN IF NOT EXISTS calories_kcal NUMERIC;
ALTER TABLE nutrition_items ADD COLUMN IF NOT EXISTS fat_g NUMERIC;
CREATE INDEX IF NOT EXISTS nutrition_items_embedding_idx
  ON nutrition_items USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS nutrition_items_allergen_gin
  ON nutrition_items USING gin (allergen_tags);
-- Lets the seed route upsert by name instead of inserting duplicates on re-run.
CREATE UNIQUE INDEX IF NOT EXISTS nutrition_items_canonical_name_idx
  ON nutrition_items (canonical_name);

-- ============ SCANS ============
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  health_profile_id UUID NOT NULL REFERENCES health_profiles(id),
  image_url TEXT NOT NULL,
  image_width INT,
  image_height INT,
  raw_detection_json JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'detected' | 'scored' | 'failed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ SCAN ITEMS ============
CREATE TABLE IF NOT EXISTS scan_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  detected_label TEXT NOT NULL,        -- raw label from Bedrock, e.g. "grilled chicken thigh"
  point_x NUMERIC NOT NULL,            -- normalized 0.0-1.0, relative to image
  point_y NUMERIC NOT NULL,
  bbox JSONB,                          -- optional {x,y,w,h}; point is derived as center
  confidence NUMERIC,
  matched_nutrition_item_id UUID REFERENCES nutrition_items(id),
  match_score NUMERIC,                 -- cosine similarity of embedding match
  match_method TEXT,                   -- 'vector' | 'alias_exact' | 'unmatched'
  -- scoring engine output, recomputed on every profile switch (no AI call):
  color TEXT,                          -- 'green' | 'yellow' | 'red'
  risk_score NUMERIC,                  -- 0-100, color is bucketed from this
  reasoning TEXT,
  risk_breakdown JSONB,                -- [{"rule":"glycemic","flag":"red","detail":"..."}, ...]
  consumed BOOLEAN,                    -- NULL = not yet confirmed, true = eaten, false = skipped
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scan_items_scan_id_idx ON scan_items(scan_id);
-- Added after scan_items was already live in production.
ALTER TABLE scan_items ADD COLUMN IF NOT EXISTS consumed BOOLEAN;
-- One-time backfill: items detected before this confirm-what-you-ate feature
-- shipped are treated as confirmed-eaten so existing history/dashboard data
-- doesn't vanish. The fixed cutoff means re-running this file never touches
-- items created after the feature shipped, no matter how many times it runs.
UPDATE scan_items SET consumed = true
WHERE consumed IS NULL AND created_at < '2026-06-25T12:00:00Z';

-- ============ CHAT ============
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  role TEXT NOT NULL,                  -- 'user' | 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_scan_id_idx ON chat_messages(scan_id);
