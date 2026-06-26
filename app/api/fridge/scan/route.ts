import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUserId } from "../../../../lib/auth";
import { getActiveProfile, getProfileConditions } from "../../../../lib/db/queries/profiles";
import { detectFridgeItems } from "../../../../lib/ai/detectFridgeItems";
import { suggestRecipes } from "../../../../lib/ai/suggestRecipes";

const RECIPE_COUNT = 3;

// Stateless by design, like the general assistant: nothing here is written
// to the database (no Blob upload, no scan row), so it never shows up in
// history or the nutrition dashboard. Detect what's in the fridge, suggest
// recipes that fit the active health profile, done.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const userId = await getOrCreateUserId();

  const activeProfile = await getActiveProfile(userId);
  const conditions = activeProfile ? await getProfileConditions(activeProfile.id) : [];

  const formData = await req.formData();
  const file = formData.get("image") as File | null;
  if (!file) {
    return NextResponse.json({ error: "image file is required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = await detectFridgeItems(buffer.toString("base64"), file.type || "image/jpeg");

  if (detected.length === 0) {
    return NextResponse.json({ ingredients: [], recipes: [] });
  }

  const ingredientLabels = detected.map((d) => d.label);
  const recipes = await suggestRecipes(ingredientLabels, conditions, RECIPE_COUNT);

  return NextResponse.json({ ingredients: ingredientLabels, recipes });
}
