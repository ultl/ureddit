import { NextRequest, NextResponse } from "next/server";
import { db } from "@repo/db/client";
import { communities, communityMembers } from "@repo/db/schema";
import { eq, sql } from "drizzle-orm";
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

  await db.insert(communityMembers).values({ communityId: community.id, userId }).onConflictDoNothing();
  await db.update(communities).set({ memberCount: sql`${communities.memberCount} + 1` }).where(eq(communities.id, community.id));

  return NextResponse.json({ ok: true });
}
