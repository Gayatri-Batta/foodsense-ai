import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUserId } from "../../../../../lib/auth";
import { getActiveProfile, getProfileConditions } from "../../../../../lib/db/queries/profiles";
import { getScanItemsWithNutrition } from "../../../../../lib/db/queries/scans";
import { getChatHistory, insertChatMessage } from "../../../../../lib/db/queries/chat";
import { chatTurn, type ScanItemContext, type ConditionContext } from "../../../../../lib/ai/chatTurn";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: scanId } = await params;
  const history = await getChatHistory(scanId, 50);
  return NextResponse.json({ messages: history });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: scanId } = await params;
  const userId = await getOrCreateUserId();
  const { message } = (await req.json()) as { message: string };

  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const activeProfile = await getActiveProfile(userId);
  const conditionInputs = activeProfile ? await getProfileConditions(activeProfile.id) : [];
  const conditions: ConditionContext[] = conditionInputs.map((c) => ({ label: c.ruleKey, severity: c.severity }));

  const scanItems = await getScanItemsWithNutrition(scanId);
  const itemContext: ScanItemContext[] = scanItems.map((it) => ({
    label: it.detected_label,
    color: (it.color ?? "yellow") as ScanItemContext["color"],
    reasoning: it.reasoning ?? "",
    glycemicIndex: it.glycemic_index,
    cholesterolMg: it.cholesterol_mg == null ? null : Number(it.cholesterol_mg),
  }));

  const history = (await getChatHistory(scanId, 10)).map((m) => ({ role: m.role, content: m.content }));

  await insertChatMessage(scanId, "user", message);
  const reply = await chatTurn(itemContext, conditions, history, message);
  const saved = await insertChatMessage(scanId, "assistant", reply);

  return NextResponse.json({ message: saved });
}
