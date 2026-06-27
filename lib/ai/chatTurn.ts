import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { getBedrockClient, MODEL_ID } from "./bedrock";

export interface ScanItemContext {
  label: string;
  color: "green" | "yellow" | "red";
  reasoning: string;
  glycemicIndex?: number | null;
  cholesterolMg?: number | null;
}

export interface ConditionContext {
  label: string;
  severity: string;
}

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSystemPrompt(items: ScanItemContext[], conditions: ConditionContext[]): string {
  const itemLines = items
    .map((it, i) => `${i + 1}. ${it.label} — ${it.color.toUpperCase()} — ${it.reasoning}`)
    .join("\n");
  const profileLine = conditions.map((c) => `${c.label} (${c.severity})`).join(", ") || "none";

  return `You are a nutrition assistant. The user scanned a plate with these detected items and
personalized risk assessments:
${itemLines}

User's active health profile: ${profileLine}.

Answer the user's question using ONLY this context. If asked about something not in the scan,
say so honestly rather than inventing nutrition facts.

Formatting: reply in plain conversational sentences only. Never use markdown such as asterisks for
bold, bullet dashes, or "---" dividers — this chat displays raw text exactly as written, so any
markdown syntax would show up as literal symbols on screen. Keep the whole answer to 2-4 short
sentences and make your point once; don't restate the same caveat in multiple sections.`;
}

export async function chatTurn(
  items: ScanItemContext[],
  conditions: ConditionContext[],
  history: ChatHistoryMessage[],
  userMessage: string,
): Promise<string> {
  const client = getBedrockClient();

  const command = new ConverseCommand({
    modelId: MODEL_ID,
    system: [{ text: buildSystemPrompt(items, conditions) }],
    messages: [
      ...history.map((m) => ({ role: m.role, content: [{ text: m.content }] })),
      { role: "user" as const, content: [{ text: userMessage }] },
    ],
    inferenceConfig: { maxTokens: 300, temperature: 0.4 },
  });

  const response = await client.send(command);
  const content = response.output?.message?.content ?? [];
  const textBlock = content.find((b) => "text" in b);
  return textBlock?.text ?? "";
}
