import { NextRequest, NextResponse } from "next/server";
import { db } from "@repo/db/client";
import { communities, communityMembers } from "@repo/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await params;
  const userId = session.user.id;

  const [community] = await db.select({ id: communities.id }).from(communities).where(eq(communities.name, name));
  if (!community) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(communityMembers).where(and(eq(communityMembers.communityId, community.id), eq(communityMembers.userId, userId)));
  await db.update(communities).set({ memberCount: sql`GREATEST(${communities.memberCount} - 1, 0)` }).where(eq(communities.id, community.id));

  return NextResponse.json({ ok: true });
}
