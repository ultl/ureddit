import { NextRequest, NextResponse } from "next/server";
import { db } from "@repo/db/client";
import { posts, postVotes, users } from "@repo/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;
  const { value } = await req.json() as { value: number };

  if (value !== 1 && value !== -1 && value !== 0) {
    return NextResponse.json({ error: "Invalid vote value" }, { status: 400 });
  }

  const userId = session.user.id;

  // Get existing vote
  const [existing] = await db
    .select()
    .from(postVotes)
    .where(and(eq(postVotes.postId, postId), eq(postVotes.userId, userId)));

  const prevValue = existing?.value ?? 0;
  // Toggle off if same direction, otherwise set new value
  const newValue = prevValue === value ? 0 : value;
  const scoreDelta = newValue - prevValue;

  if (newValue === 0) {
    await db.delete(postVotes).where(and(eq(postVotes.postId, postId), eq(postVotes.userId, userId)));
  } else if (existing) {
    await db.update(postVotes).set({ value: newValue }).where(and(eq(postVotes.postId, postId), eq(postVotes.userId, userId)));
  } else {
    await db.insert(postVotes).values({ postId, userId, value: newValue });
  }

  if (scoreDelta !== 0) {
    // Update post score
    await db.update(posts).set({ score: sql`${posts.score} + ${scoreDelta}` }).where(eq(posts.id, postId));

    // Update author karma
    const [post] = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, postId));
    if (post) {
      await db.update(users).set({ postKarma: sql`${users.postKarma} + ${scoreDelta}` }).where(eq(users.id, post.authorId));
    }
  }

  return NextResponse.json({ newValue });
}
