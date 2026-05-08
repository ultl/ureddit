import { NextRequest, NextResponse } from "next/server";
import { db } from "@repo/db/client";
import { comments, commentVotes, users } from "@repo/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await params;
  const { value } = await req.json() as { value: number };
  if (value !== 1 && value !== -1) return NextResponse.json({ error: "Invalid value" }, { status: 400 });

  const userId = session.user.id;

  const [existing] = await db
    .select()
    .from(commentVotes)
    .where(and(eq(commentVotes.commentId, commentId), eq(commentVotes.userId, userId)));

  const prevValue = existing?.value ?? 0;
  const newValue = prevValue === value ? 0 : value;
  const delta = newValue - prevValue;

  if (newValue === 0) {
    await db.delete(commentVotes).where(and(eq(commentVotes.commentId, commentId), eq(commentVotes.userId, userId)));
  } else if (existing) {
    await db.update(commentVotes).set({ value: newValue }).where(and(eq(commentVotes.commentId, commentId), eq(commentVotes.userId, userId)));
  } else {
    await db.insert(commentVotes).values({ commentId, userId, value: newValue });
  }

  if (delta !== 0) {
    await db.update(comments).set({ score: sql`${comments.score} + ${delta}` }).where(eq(comments.id, commentId));
    const [comment] = await db.select({ authorId: comments.authorId }).from(comments).where(eq(comments.id, commentId));
    if (comment) {
      await db.update(users).set({ commentKarma: sql`${users.commentKarma} + ${delta}` }).where(eq(users.id, comment.authorId));
    }
  }

  return NextResponse.json({ newValue });
}
