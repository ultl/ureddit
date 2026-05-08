import { NextRequest, NextResponse } from "next/server";
import { db } from "@repo/db/client";
import { users } from "@repo/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      image: users.image,
      banner: users.banner,
      bio: users.bio,
      postKarma: users.postKarma,
      commentKarma: users.commentKarma,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.name, username));

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(user);
}
