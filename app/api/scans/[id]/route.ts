import { NextResponse } from "next/server";
import { query } from "../../../../lib/db/pool";
import { getScanItems, type ScanRow } from "../../../../lib/db/queries/scans";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const scans = await query<ScanRow>(`SELECT * FROM scans WHERE id = $1`, [id]);
  const scan = scans[0];
  if (!scan) {
    return NextResponse.json({ error: "scan not found" }, { status: 404 });
  }

  const items = await getScanItems(id);
  return NextResponse.json({ scan, items });
}
