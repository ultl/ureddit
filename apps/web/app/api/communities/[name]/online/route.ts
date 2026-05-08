import { NextRequest, NextResponse } from "next/server";
import { db } from "@repo/db/client";
import { communities } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { redis } from "@repo/db/redis";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const [community] = await db
    .select({ id: communities.id })
    .from(communities)
    .where(eq(communities.name, name));
  if (!community) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const count = await redis.scard(`community:${community.id}:online`);
  return NextResponse.json({ count });
}
