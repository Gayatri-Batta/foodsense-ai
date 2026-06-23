import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUserId } from "../../../lib/auth";
import { createProfile, listProfiles, type ProfileConditionSelection } from "../../../lib/db/queries/profiles";

export async function GET() {
  const userId = await getOrCreateUserId();
  const profiles = await listProfiles(userId);
  return NextResponse.json({ profiles });
}

interface CreateProfileBody {
  label: string;
  conditions: ProfileConditionSelection[];
}

export async function POST(req: NextRequest) {
  const userId = await getOrCreateUserId();
  const body = (await req.json()) as CreateProfileBody;

  if (!body.label || !Array.isArray(body.conditions)) {
    return NextResponse.json({ error: "label and conditions[] are required" }, { status: 400 });
  }

  const profile = await createProfile(userId, body.label, body.conditions);
  return NextResponse.json({ profile });
}
