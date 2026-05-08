import { NextRequest, NextResponse } from "next/server";
import { db } from "@repo/db/client";
import { communities, flairs } from "@repo/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const [community] = await db.select({ id: communities.id }).from(communities).where(eq(communities.name, name));
  if (!community) return NextResponse.json([], { status: 200 });

  const rows = await db.select().from(flairs).where(eq(flairs.communityId, community.id));
  return NextResponse.json(rows);
}
