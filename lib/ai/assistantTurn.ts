import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { getBedrockClient, MODEL_ID } from "./bedrock";
import type { DailyNutritionTotals } from "../db/queries/scans";

export interface AssistantConditionContext {
  label: string;
  severity: string;
}

export interface AssistantHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function buildSystemPrompt(conditions: AssistantConditionContext[], totals: DailyNutritionTotals, eatenLabels: string[]): string {
  const profileLine = conditions.map((c) => `${c.label} (${c.severity})`).join(", ") || "none set";
  const eatenLine = eatenLabels.length > 0 ? eatenLabels.join(", ") : "nothing confirmed yet";
  const totalsLine = `${round(totals.caloriesKcal)} kcal, ${round(totals.carbsG)}g carbs, ${round(totals.proteinG)}g protein, ${round(totals.fatG)}g fat, ${round(totals.sugarG)}g sugar, ${round(totals.sodiumMg)}mg sodium so far today`;

  return `You are the general health and nutrition assistant inside FoodSense AI, a food-scanning app.
The user can ask anything food, nutrition, or health related, including casual questions about their
own day, like whether they have room for another snack.

User's active health profile conditions: ${profileLine}.
Confirmed-eaten today: ${eatenLine}.
Running totals so far today: ${totalsLine}.

Use this context when the question is about today or "so far" or similar. For general questions that
have nothing to do with their logged data, just answer with sound, general nutrition knowledge.
Keep answers short and conversational, like a knowledgeable friend rather than a clinical report.
If a question really needs a doctor's judgment, such as medication interactions or a diagnosis, say
so honestly instead of guessing. This conversation is for answering questions only; nothing said here
gets saved or added to the user's dashboard.`;
}

export async function assistantTurn(
  conditions: AssistantConditionContext[],
  totals: DailyNutritionTotals,
  eatenLabels: string[],
  history: AssistantHistoryMessage[],
  userMessage: string,
): Promise<string> {
  const client = getBedrockClient();

  const command = new ConverseCommand({
    modelId: MODEL_ID,
    system: [{ text: buildSystemPrompt(conditions, totals, eatenLabels) }],
    messages: [
      ...history.map((m) => ({ role: m.role, content: [{ text: m.content }] })),
      { role: "user" as const, content: [{ text: userMessage }] },
    ],
  });

  const response = await client.send(command);
  const content = response.output?.message?.content ?? [];
  const textBlock = content.find((b) => "text" in b);
  return textBlock?.text ?? "";
}
