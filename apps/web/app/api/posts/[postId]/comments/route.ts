import { NextRequest, NextResponse } from "next/server";
import { db } from "@repo/db/client";
import { comments, users, commentVotes, posts, notifications } from "@repo/db/schema";
import { eq, and, desc, asc, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { createRedisClient } from "@repo/db/redis";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const sort = req.nextUrl.searchParams.get("sort") ?? "best";

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;

  const orderBy = sort === "new"
    ? desc(comments.createdAt)
    : sort === "old"
    ? asc(comments.createdAt)
    : desc(comments.score); // best / top / controversial all use score for now

  const rows = await db
    .select({
      id: comments.id,
      content: comments.content,
      postId: comments.postId,
      parentId: comments.parentId,
      depth: comments.depth,
      score: comments.score,
      createdAt: comments.createdAt,
      authorId: comments.authorId,
      authorName: users.name,
      authorImage: users.image,
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.postId, postId))
    .orderBy(orderBy);

  // Fetch user votes
  let userVotes: Record<string, number> = {};
  if (userId && rows.length > 0) {
    const ids = rows.map((r) => r.id) as [string, ...string[]];
    const votes = await db
      .select({ commentId: commentVotes.commentId, value: commentVotes.value })
      .from(commentVotes)
      .where(and(eq(commentVotes.userId, userId), inArray(commentVotes.commentId, ids)));
    userVotes = Object.fromEntries(votes.map((v) => [v.commentId, v.value]));
  }

  const data = rows.map((r) => ({ ...r, userVote: userVotes[r.id] ?? 0 }));
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;
  const { content, parentId } = await req.json() as { content: string; parentId?: string };

  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  // Compute depth from parent
  let depth = 0;
  if (parentId) {
    const [parent] = await db.select({ depth: comments.depth }).from(comments).where(eq(comments.id, parentId));
    depth = (parent?.depth ?? 0) + 1;
  }

  const id = nanoid();
  const userId = session.user.id;

  const [comment] = await db.insert(comments).values({
    id,
    content,
    postId,
    authorId: userId,
    parentId: parentId ?? null,
    depth,
  }).returning();

  // Increment post comment count
  await db.update(posts).set({ commentCount: sql`${posts.commentCount} + 1` }).where(eq(posts.id, postId));

  // Detect @mentions in Tiptap JSON and notify
  const mentionUserIds: string[] = [];
  try {
    const parsed = JSON.parse(content) as { content?: unknown[] };
    function findMentions(nodes: unknown[]) {
      for (const node of nodes) {
        const n = node as { type?: string; attrs?: { id?: string }; content?: unknown[] };
        if (n.type === "mention" && n.attrs?.id) mentionUserIds.push(n.attrs.id);
        if (n.content) findMentions(n.content);
      }
    }
    if (parsed.content) findMentions(parsed.content);
  } catch { /* not JSON */ }

  // Notify parent comment author (comment_reply)
  if (parentId) {
    const [parent] = await db.select({ authorId: comments.authorId }).from(comments).where(eq(comments.id, parentId));
    if (parent && parent.authorId !== userId) {
      await db.insert(notifications).values({
        id: nanoid(), userId: parent.authorId, type: "comment_reply",
        actorId: userId, postId, commentId: id,
      }).onConflictDoNothing();
    }
  }

  // Notify @mentioned users
  const uniqueMentions = [...new Set(mentionUserIds)].filter((uid) => uid !== userId);
  if (uniqueMentions.length > 0) {
    await db.insert(notifications).values(
      uniqueMentions.map((uid) => ({
        id: nanoid(), userId: uid, type: "mention" as const,
        actorId: userId, postId, commentId: id,
      }))
    ).onConflictDoNothing();
  }

  // Publish to Redis for SSE
  try {
    const pub = createRedisClient();
    await pub.publish(`post:${postId}:comments`, JSON.stringify({ ...comment, authorName: session.user.name, authorImage: session.user.image, userVote: 0 }));
    await pub.quit();
  } catch { /* SSE not critical */ }

  return NextResponse.json({ ...comment, authorName: session.user.name, authorImage: session.user.image, userVote: 0 }, { status: 201 });
}
