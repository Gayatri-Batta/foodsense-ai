import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { getBedrockClient, MODEL_ID } from "./bedrock";

export interface DetectedFridgeItem {
  label: string;
  confidence?: number;
}

const REPORT_TOOL = {
  toolSpec: {
    name: "report_fridge_items",
    description: "Report each distinct food ingredient or packaged item visible in the photo.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string", description: "concise common name, e.g. 'shredded cheddar' or 'cherry tomatoes'" },
                confidence: { type: "number" },
              },
              required: ["label"],
            },
          },
        },
        required: ["items"],
      },
    },
  },
};

const PROMPT = `Identify every distinct food ingredient or packaged item visible in this fridge or pantry
photo, including fresh produce, dairy, leftovers, condiments, and packaged goods. Use concise, common
names rather than brand names (e.g. "milk" not the brand printed on the carton). Skip non-food items.
Call report_fridge_items with your findings.`;

const MIN_CONFIDENCE = 0.3;

// Same forced-tool-use pattern as detectFoodItems, but no x/y coordinates —
// there's no dot-overlay UI for a fridge photo, just an ingredient list feeding
// into recipe suggestions.
export async function detectFridgeItems(imageBase64: string, mediaType = "image/jpeg"): Promise<DetectedFridgeItem[]> {
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
      toolChoice: { tool: { name: "report_fridge_items" } },
    },
  });

  const response = await client.send(command);
  const content = response.output?.message?.content ?? [];
  const toolUse = content.find((b) => "toolUse" in b)?.toolUse;
  const items = (toolUse?.input as { items?: DetectedFridgeItem[] } | undefined)?.items ?? [];

  return items.filter((item) => item.confidence == null || item.confidence >= MIN_CONFIDENCE);
}
