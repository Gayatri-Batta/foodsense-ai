// Tunable thresholds for the scoring engine. Kept separate from engine.ts
// so they're easy to find/defend/adjust without touching aggregation logic.

export const GLYCEMIC = {
  severe: { red: 55, yellow: 40 },
  moderate: { red: 70, yellow: 55 },
  mild: { red: 85, yellow: 70 },
};

export const CHOLESTEROL_MG = {
  severe: { red: 60, yellow: 30 },
  moderate: { red: 100, yellow: 50 },
  mild: { red: 150, yellow: 80 },
};

export const SODIUM_MG = {
  severe: { red: 400, yellow: 200 },
  moderate: { red: 700, yellow: 400 },
  mild: { red: 1000, yellow: 600 },
};

export const RISK_SCORE_BY_COLOR = {
  red: 80,
  yellow: 45,
  green: 10,
} as const;

export const VECTOR_MATCH_ACCEPT_SIMILARITY = 0.82;
export const VECTOR_MATCH_APPROXIMATE_SIMILARITY = 0.65;
