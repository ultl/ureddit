import { NextRequest, NextResponse } from "next/server";
import { db } from "@repo/db/client";
import { communities, communityMembers } from "@repo/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { enqueueSyncCommunity } from "@repo/db/queue";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, displayName, description, icon, banner } = await req.json() as {
    name: string;
    displayName: string;
    description?: string;
    icon?: string;
    banner?: string;
  };

  if (!name || !displayName) {
    return NextResponse.json({ error: "name and displayName are required" }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_]{3,21}$/.test(name)) {
    return NextResponse.json({ error: "Name must be 3–21 alphanumeric characters or underscores" }, { status: 400 });
  }

  const id = nanoid();
  const userId = session.user.id;

  const [community] = await db.insert(communities).values({
    id,
    name,
    displayName,
    description,
    icon,
    banner,
    creatorId: userId,
    memberCount: 1,
  }).returning();

  // Creator is automatically a member
  await db.insert(communityMembers).values({ communityId: id, userId });

  await enqueueSyncCommunity(id);

  return NextResponse.json(community, { status: 201 });
}
