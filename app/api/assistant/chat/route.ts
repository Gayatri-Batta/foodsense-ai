import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUserId } from "../../../../lib/auth";
import { getActiveProfile, getProfileConditions } from "../../../../lib/db/queries/profiles";
import { listDailyNutritionItems } from "../../../../lib/db/queries/scans";
import { sumDailyNutrition } from "../../../../lib/nutrition/aggregate";
import { assistantTurn, type AssistantHistoryMessage } from "../../../../lib/ai/assistantTurn";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// General health/nutrition Q&A, separate from the per-scan chat. Deliberately
// stateless: nothing here is written to the database, so it never shows up
// in history or the nutrition dashboard. It only reads existing data for
// context (active profile conditions, what's been confirmed eaten today).
export async function POST(req: NextRequest) {
  const userId = await getOrCreateUserId();
  const { message, history } = (await req.json().catch(() => ({}))) as {
    message?: string;
    history?: AssistantHistoryMessage[];
  };

  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const activeProfile = await getActiveProfile(userId);
  const conditionInputs = activeProfile ? await getProfileConditions(activeProfile.id) : [];
  const conditions = conditionInputs.map((c) => ({ label: c.ruleKey, severity: c.severity }));

  const todayItems = await listDailyNutritionItems(userId, todayUtc());
  const { totals } = sumDailyNutrition(todayItems);
  const eatenLabels = todayItems.map((it) => it.canonicalName ?? it.detectedLabel);

  const reply = await assistantTurn(conditions, totals, eatenLabels, (history ?? []).slice(-10), message);

  return NextResponse.json({ reply });
}
