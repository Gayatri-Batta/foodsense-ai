import { NextResponse } from "next/server";
import { getOrCreateUserId } from "../../../../../lib/auth";
import { getActiveProfile, getProfileConditions } from "../../../../../lib/db/queries/profiles";
import { getScanItemsWithNutrition, updateScanItemScore } from "../../../../../lib/db/queries/scans";
import { scoreItem, type NutritionRowInput } from "../../../../../lib/scoring/engine";

// The headline "wow" route: re-runs the deterministic scoring engine against
// the newly-active health profile for an existing scan's already-detected
// items. Zero Bedrock/network calls — must stay that way so the live
// profile-switch demo is instant every time.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: scanId } = await params;
  const userId = await getOrCreateUserId();

  const activeProfile = await getActiveProfile(userId);
  if (!activeProfile) {
    return NextResponse.json({ error: "No active health profile" }, { status: 400 });
  }

  const conditions = await getProfileConditions(activeProfile.id);
  const items = await getScanItemsWithNutrition(scanId);

  const updated = [];
  for (const item of items) {
    const nutrition: NutritionRowInput | null = item.matched_nutrition_item_id
      ? {
          glycemicIndex: item.glycemic_index,
          glycemicLoad: item.glycemic_load == null ? null : Number(item.glycemic_load),
          cholesterolMg: item.cholesterol_mg == null ? null : Number(item.cholesterol_mg),
          saturatedFatG: item.saturated_fat_g == null ? null : Number(item.saturated_fat_g),
          sodiumMg: item.sodium_mg == null ? null : Number(item.sodium_mg),
          sugarG: item.sugar_g == null ? null : Number(item.sugar_g),
          allergenTags: item.allergen_tags ?? [],
          dietFlags: item.diet_flags ?? [],
          keyNutrients: item.key_nutrients ?? {},
        }
      : null;

    const scored = scoreItem(conditions, nutrition);
    await updateScanItemScore(item.id, scored);
    updated.push({ ...item, ...scored });
  }

  return NextResponse.json({ items: updated });
}
