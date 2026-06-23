import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { getBedrockClient, MODEL_ID } from "./bedrock";

export interface DetectedFoodItem {
  label: string;
  x: number; // normalized 0-1, horizontal center
  y: number; // normalized 0-1, vertical center
  confidence?: number;
}

const REPORT_TOOL = {
  toolSpec: {
    name: "report_food_items",
    description: "Report each distinct food item visible in the image.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string", description: "concise food name, e.g. 'grilled chicken thigh'" },
                x: { type: "number", description: "normalized 0-1 horizontal center of the item's visible mass" },
                y: { type: "number", description: "normalized 0-1 vertical center of the item's visible mass" },
                confidence: { type: "number" },
              },
              required: ["label", "x", "y"],
            },
          },
        },
        required: ["items"],
      },
    },
  },
};

const PROMPT = `Identify every distinct food item visible on this plate/photo. For each item, estimate the
center point of its visible mass as a fraction of image width (x) and height (y), where 0.0 is the
left/top edge and 1.0 is the right/bottom edge. Use concise, common food names. Call report_food_items
with your findings.`;

// Detection is a structural-only step: it returns labels + approximate coordinates.
// Nutrition facts and scoring come from lib/scoring/engine.ts + the nutrition_items
// table, never from the vision model — keeps the demo's claims grounded in real data.
export async function detectFoodItems(imageBase64: string, mediaType = "image/jpeg"): Promise<DetectedFoodItem[]> {
  const client = getBedrockClient();

  const command = new ConverseCommand({
    modelId: MODEL_ID,
    messages: [
      {
        role: "user",
        content: [
          { image: { format: mediaType.split("/")[1] as "jpeg" | "png", source: { bytes: Buffer.from(imageBase64, "base64") } } },
          { text: PROMPT },
        ],
      },
    ],
    toolConfig: {
      tools: [REPORT_TOOL],
      toolChoice: { tool: { name: "report_food_items" } },
    },
  });

  const response = await client.send(command);
  const content = response.output?.message?.content ?? [];
  const toolUse = content.find((b) => "toolUse" in b)?.toolUse;
  const items = (toolUse?.input as { items?: DetectedFoodItem[] } | undefined)?.items ?? [];
  return items;
}
