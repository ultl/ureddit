import { NextRequest, NextResponse } from "next/server";
import { db } from "@repo/db/client";
import { comments, users, posts, communities } from "@repo/db/schema";
import { eq, desc } from "drizzle-orm";

const LIMIT = 25;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const [author] = await db.select({ id: users.id }).from(users).where(eq(users.name, username));
  if (!author) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select({
      id: comments.id,
      content: comments.content,
      score: comments.score,
      createdAt: comments.createdAt,
      postId: comments.postId,
      postTitle: posts.title,
      communityName: communities.name,
    })
    .from(comments)
    .innerJoin(posts, eq(comments.postId, posts.id))
    .innerJoin(communities, eq(posts.communityId, communities.id))
    .where(eq(comments.authorId, author.id))
    .orderBy(desc(comments.createdAt))
    .limit(LIMIT);

  return NextResponse.json(rows);
}
