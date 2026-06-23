import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getOrCreateUserId } from "../../../lib/auth";
import { getActiveProfile, getProfileConditions } from "../../../lib/db/queries/profiles";
import { createScan, insertScanItem, setScanStatus } from "../../../lib/db/queries/scans";
import { matchNutritionItem } from "../../../lib/db/queries/nutrition";
import { detectFoodItems } from "../../../lib/ai/detectFoodItems";
import { scoreItem } from "../../../lib/scoring/engine";

// Creates a scan end-to-end: upload image -> Bedrock detection -> pgvector
// nutrition match (with fallback tiers) -> deterministic scoring -> persist.
// This is the only route that calls the vision model; profile switches
// later re-score the same scan_items without touching Bedrock again.
export async function POST(req: NextRequest) {
  const userId = await getOrCreateUserId();

  const activeProfile = await getActiveProfile(userId);
  if (!activeProfile) {
    return NextResponse.json({ error: "No active health profile. Create/activate one first." }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("image") as File | null;
  const width = Number(formData.get("width") ?? 0);
  const height = Number(formData.get("height") ?? 0);

  if (!file) {
    return NextResponse.json({ error: "image file is required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const blob = await put(`scans/${userId}/${Date.now()}-${file.name}`, buffer, {
    access: "public",
    contentType: file.type,
  });

  const scan = await createScan(userId, activeProfile.id, blob.url, width, height);

  const detected = await detectFoodItems(buffer.toString("base64"), file.type || "image/jpeg");
  await setScanStatus(scan.id, "detected", { items: detected });

  const conditions = await getProfileConditions(activeProfile.id);

  const items = [];
  for (const item of detected) {
    const match = await matchNutritionItem(item.label);
    const scored = scoreItem(conditions, match.nutrition);
    const scanItem = await insertScanItem(
      scan.id,
      item.label,
      item.x,
      item.y,
      item.confidence ?? null,
      { nutritionItemId: match.nutritionItemId, matchScore: match.matchScore, matchMethod: match.matchMethod },
      scored,
    );
    items.push(scanItem);
  }

  await setScanStatus(scan.id, "scored");

  return NextResponse.json({ scan, items });
}
