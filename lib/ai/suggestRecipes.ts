import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { getBedrockClient, MODEL_ID } from "./bedrock";
import type { ConditionInput } from "../scoring/engine";

export interface RecipeSuggestion {
  title: string;
  description: string;
  usesFromFridge: string[];
  otherIngredientsNeeded: string[];
  steps: string[];
  caution: string | null;
}

const REPORT_TOOL = {
  toolSpec: {
    name: "report_recipes",
    description: "Report recipe suggestions built around the given fridge ingredients.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          recipes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string", description: "one or two sentence summary" },
                usesFromFridge: { type: "array", items: { type: "string" }, description: "which listed fridge items this recipe uses" },
                otherIngredientsNeeded: {
                  type: "array",
                  items: { type: "string" },
                  description: "anything needed beyond the fridge contents and common pantry staples",
                },
                steps: { type: "array", items: { type: "string" }, description: "short numbered cooking steps" },
                caution: {
                  type: ["string", "null"],
                  description: "short note if this recipe conflicts with one of the user's health conditions, otherwise null",
                },
              },
              required: ["title", "description", "usesFromFridge", "steps"],
            },
          },
        },
        required: ["recipes"],
      },
    },
  },
};

function describeCondition(c: ConditionInput): string {
  switch (c.ruleKey) {
    case "glycemic_sensitivity":
      return `glycemic sensitivity / diabetes (${c.severity}), avoid high-sugar or high-glycemic recipes`;
    case "cholesterol_sensitivity":
      return `cholesterol sensitivity (${c.severity}), avoid recipes heavy in saturated fat or cholesterol`;
    case "sodium_sensitivity":
      return `sodium sensitivity / hypertension (${c.severity}), avoid heavily salted or processed ingredients`;
    case "allergen_avoid":
      return `a severe allergy to ${c.allergenTag ?? "an allergen"}, recipes must NOT contain it under any circumstances`;
    case "vegan_avoid":
      return "a vegan diet, no animal products at all";
    case "vegetarian_avoid":
      return "a vegetarian diet, no meat or fish";
    case "keto_avoid":
      return "a keto diet, keep carbs low";
    default:
      return c.ruleKey;
  }
}

function buildPrompt(ingredients: string[], conditions: ConditionInput[], count: number): string {
  const ingredientLine = ingredients.join(", ");
  const conditionLines = conditions.map((c) => `- ${describeCondition(c)}`).join("\n");
  const allergenConditions = conditions.filter((c) => c.ruleKey === "allergen_avoid");

  return `A user photographed their fridge/pantry and these items were detected: ${ingredientLine}.

${
  conditions.length > 0
    ? `The user's health profile includes:\n${conditionLines}\n`
    : "The user has no health conditions set on their active profile.\n"
}
Suggest exactly ${count} recipes that primarily use the detected ingredients. Common pantry staples
(salt, pepper, cooking oil, flour, sugar, water) can be assumed available even if not detected. For
each recipe, list which detected ingredients it uses (usesFromFridge) and anything else needed beyond
staples (otherIngredientsNeeded).
${
  allergenConditions.length > 0
    ? `Do NOT suggest any recipe that contains ${allergenConditions
        .map((c) => c.allergenTag)
        .join(" or ")} under any circumstances, this is a strict exclusion, not a caution.\n`
    : ""
}
For other conditions (diabetes, cholesterol, sodium, vegan, vegetarian, keto), only set "caution" to a
short note if a recipe meaningfully conflicts with one of them; otherwise leave it null. Call
report_recipes with your suggestions.`;
}

// Text-only Converse call (no image) with forced tool use, same reliability
// pattern as the vision detection step. Recipes are generated directly by the
// model rather than assembled from the nutrition_items catalog, since recipes
// are open-ended and not tied to canonical catalog rows the way scanned plate
// items are.
export async function suggestRecipes(ingredients: string[], conditions: ConditionInput[], count = 3): Promise<RecipeSuggestion[]> {
  const client = getBedrockClient();

  const command = new ConverseCommand({
    modelId: MODEL_ID,
    messages: [{ role: "user", content: [{ text: buildPrompt(ingredients, conditions, count) }] }],
    toolConfig: {
      tools: [REPORT_TOOL],
      toolChoice: { tool: { name: "report_recipes" } },
    },
  });

  const response = await client.send(command);
  const content = response.output?.message?.content ?? [];
  const toolUse = content.find((b) => "toolUse" in b)?.toolUse;
  const recipes = (toolUse?.input as { recipes?: Partial<RecipeSuggestion>[] } | undefined)?.recipes ?? [];

  return recipes.map((r) => ({
    title: r.title ?? "Untitled recipe",
    description: r.description ?? "",
    usesFromFridge: r.usesFromFridge ?? [],
    otherIngredientsNeeded: r.otherIngredientsNeeded ?? [],
    steps: r.steps ?? [],
    caution: r.caution ?? null,
  }));
}
