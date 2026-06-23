import { NextResponse } from "next/server";
import { listConditionCatalog } from "../../../lib/db/queries/profiles";

export async function GET() {
  const conditions = await listConditionCatalog();
  return NextResponse.json({ conditions });
}
