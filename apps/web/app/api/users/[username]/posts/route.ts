import { NextRequest, NextResponse } from "next/server";
import { db } from "@repo/db/client";
import { posts, communities, users, postVotes, flairs } from "@repo/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const LIMIT = 25;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const [author] = await db.select({ id: users.id }).from(users).where(eq(users.name, username));
  if (!author) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await auth.api.getSession({ headers: await headers() });
  const viewerId = session?.user?.id;

  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      type: posts.type,
      content: posts.content,
      imageUrl: posts.imageUrl,
      linkUrl: posts.linkUrl,
      linkPreviewTitle: posts.linkPreviewTitle,
      linkPreviewImage: posts.linkPreviewImage,
      score: posts.score,
      commentCount: posts.commentCount,
      createdAt: posts.createdAt,
      authorId: posts.authorId,
      authorName: users.name,
      authorImage: users.image,
      communityId: posts.communityId,
      communityName: communities.name,
      communityDisplayName: communities.displayName,
      communityIcon: communities.icon,
      flairId: posts.flairId,
      flairName: flairs.name,
      flairColor: flairs.color,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .innerJoin(communities, eq(posts.communityId, communities.id))
    .leftJoin(flairs, eq(posts.flairId, flairs.id))
    .where(eq(posts.authorId, author.id))
    .orderBy(desc(posts.createdAt))
    .limit(LIMIT);

  let userVotes: Record<string, number> = {};
  if (viewerId && rows.length > 0) {
    const ids = rows.map((r) => r.id) as [string, ...string[]];
    const votes = await db
      .select({ postId: postVotes.postId, value: postVotes.value })
      .from(postVotes)
      .where(and(eq(postVotes.userId, viewerId), inArray(postVotes.postId, ids)));
    userVotes = Object.fromEntries(votes.map((v) => [v.postId, v.value]));
  }

  return NextResponse.json(rows.map((r) => ({ ...r, userVote: userVotes[r.id] ?? 0 })));
}
