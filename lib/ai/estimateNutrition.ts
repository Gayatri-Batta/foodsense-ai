import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { getBedrockClient, MODEL_ID } from "./bedrock";

export interface NutritionEstimate {
  canonicalName: string;
  category: string;
  servingDesc: string | null;
  glycemicIndex: number | null;
  glycemicLoad: number | null;
  caloriesKcal: number | null;
  carbsG: number | null;
  proteinG: number | null;
  fatG: number | null;
  saturatedFatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  cholesterolMg: number | null;
  allergenTags: string[];
  dietFlags: string[];
}

const CATEGORIES = [
  "protein",
  "grain",
  "vegetable",
  "fruit",
  "dairy",
  "legume",
  "nuts",
  "dessert",
  "beverage",
  "starch",
  "pasta",
  "spread",
  "fast_food",
  "salad",
  "other",
];

const REPORT_TOOL = {
  toolSpec: {
    name: "report_nutrition_estimate",
    description: "Report a best-effort nutrition estimate for one food item, for one typical serving.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          canonicalName: { type: "string", description: "clean, common name, e.g. 'Carrot Sticks'" },
          category: { type: "string", enum: CATEGORIES },
          servingDesc: { type: "string", description: "e.g. '1 cup' or '100g'" },
          glycemicIndex: { type: ["number", "null"] },
          glycemicLoad: { type: ["number", "null"] },
          caloriesKcal: { type: "number" },
          carbsG: { type: "number" },
          proteinG: { type: "number" },
          fatG: { type: "number" },
          saturatedFatG: { type: ["number", "null"] },
          fiberG: { type: ["number", "null"] },
          sugarG: { type: ["number", "null"] },
          sodiumMg: { type: "number" },
          cholesterolMg: { type: ["number", "null"] },
          allergenTags: {
            type: "array",
            items: { type: "string" },
            description: "any of: dairy, egg, peanut, tree_nut, shellfish, soy, gluten, sesame",
          },
          dietFlags: {
            type: "array",
            items: { type: "string" },
            description: "any of: vegan_unsafe, vegetarian_unsafe, keto_unsafe",
          },
        },
        required: ["canonicalName", "category", "caloriesKcal", "carbsG", "proteinG", "fatG", "sodiumMg", "allergenTags", "dietFlags"],
      },
    },
  },
};

function buildPrompt(label: string): string {
  return `Give a best-effort nutrition estimate for one standard serving of: "${label}". Use general
nutrition knowledge to produce realistic, USDA-style ballpark figures, not exact lab values. Even if
you're not fully certain, give your best reasonable estimate rather than refusing. Call
report_nutrition_estimate with your estimate.`;
}

// Fallback used when pgvector matching against the curated catalog fails to
// find a confident match (see lib/db/queries/nutrition.ts). Rather than
// leaving the item with no nutrition data at all, ask the same model already
// running the vision/chat pipeline for a reasonable estimate, then score it
// through the normal deterministic engine like any other matched item. The
// estimate also gets cached into nutrition_items so the catalog grows over
// time instead of re-asking the model for the same food every time.
export async function estimateNutrition(label: string): Promise<NutritionEstimate | null> {
  const client = getBedrockClient();

  const command = new ConverseCommand({
    modelId: MODEL_ID,
    messages: [{ role: "user", content: [{ text: buildPrompt(label) }] }],
    toolConfig: {
      tools: [REPORT_TOOL],
      toolChoice: { tool: { name: "report_nutrition_estimate" } },
    },
  });

  const response = await client.send(command);
  const content = response.output?.message?.content ?? [];
  const toolUse = content.find((b) => "toolUse" in b)?.toolUse;
  const input = toolUse?.input as Partial<NutritionEstimate> | undefined;

  if (!input?.canonicalName || input.caloriesKcal == null) return null;

  return {
    canonicalName: input.canonicalName,
    category: input.category ?? "other",
    servingDesc: input.servingDesc ?? null,
    glycemicIndex: input.glycemicIndex ?? null,
    glycemicLoad: input.glycemicLoad ?? null,
    caloriesKcal: input.caloriesKcal,
    carbsG: input.carbsG ?? null,
    proteinG: input.proteinG ?? null,
    fatG: input.fatG ?? null,
    saturatedFatG: input.saturatedFatG ?? null,
    fiberG: input.fiberG ?? null,
    sugarG: input.sugarG ?? null,
    sodiumMg: input.sodiumMg ?? null,
    cholesterolMg: input.cholesterolMg ?? null,
    allergenTags: input.allergenTags ?? [],
    dietFlags: input.dietFlags ?? [],
  };
}
