import { NextRequest, NextResponse } from "next/server";
import { db } from "@repo/db/client";
import { posts, communities, users, postVotes, hiddenPosts, flairs } from "@repo/db/schema";
import { eq, desc, lt, and, notInArray, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { enqueueSyncPost } from "@repo/db/queue";
import { nanoid } from "nanoid";
import ogs from "open-graph-scraper";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;

  const { searchParams } = req.nextUrl;
  const sort = searchParams.get("sort") === "top" ? "top" : "new";
  const communityId = searchParams.get("communityId") ?? undefined;
  const cursor = searchParams.get("cursor") ?? undefined;

  // Build hidden post exclusion for logged-in users
  let hiddenPostIds: string[] = [];
  if (userId) {
    const hidden = await db
      .select({ postId: hiddenPosts.postId })
      .from(hiddenPosts)
      .where(eq(hiddenPosts.userId, userId));
    hiddenPostIds = hidden.map((h) => h.postId);
  }

  // Base conditions
  const conditions = [];
  if (communityId) conditions.push(eq(posts.communityId, communityId));
  if (hiddenPostIds.length > 0) conditions.push(notInArray(posts.id, hiddenPostIds as [string, ...string[]]));

  // Cursor condition
  if (cursor) {
    if (sort === "new") {
      conditions.push(lt(posts.createdAt, new Date(cursor)));
    } else {
      // For "top" use score cursor encoded as "score:id"
      const parts = cursor.split(":");
      const scoreStr = parts[0] ?? "0";
      const afterId = parts[1] ?? "";
      const scoreVal = parseInt(scoreStr, 10);
      conditions.push(
        sql`(${posts.score}, ${posts.id}) < (${scoreVal}, ${afterId})`
      );
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

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
    .where(where)
    .orderBy(
      sort === "new" ? desc(posts.createdAt) : desc(posts.score)
    )
    .limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  const items = rows.slice(0, PAGE_SIZE);

  // Fetch user votes for this page
  let userVotes: Record<string, number> = {};
  if (userId && items.length > 0) {
    const ids = items.map((r) => r.id) as [string, ...string[]];
    const votes = await db
      .select({ postId: postVotes.postId, value: postVotes.value })
      .from(postVotes)
      .where(and(eq(postVotes.userId, userId), inArray(postVotes.postId, ids)));
    userVotes = Object.fromEntries(votes.map((v) => [v.postId, v.value]));
  }

  const data = items.map((row) => ({
    ...row,
    userVote: userVotes[row.id] ?? 0,
  }));

  // Build next cursor
  let nextCursor: string | null = null;
  if (hasMore) {
    const last = items.at(-1)!;
    nextCursor =
      sort === "new"
        ? last.createdAt.toISOString()
        : `${last.score}:${last.id}`;
  }

  return NextResponse.json({ posts: data, nextCursor });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    title: string;
    type: "text" | "image" | "link";
    content?: string;
    imageUrl?: string;
    linkUrl?: string;
    communityId: string;
    flairId?: string;
  };

  const { title, type, content, imageUrl, linkUrl, communityId, flairId } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!communityId) return NextResponse.json({ error: "Community is required" }, { status: 400 });
  if (type === "image" && !imageUrl) return NextResponse.json({ error: "Image is required" }, { status: 400 });
  if (type === "link" && !linkUrl) return NextResponse.json({ error: "URL is required" }, { status: 400 });

  // Fetch OG metadata for link posts
  let linkPreviewTitle: string | null = null;
  let linkPreviewDescription: string | null = null;
  let linkPreviewImage: string | null = null;

  if (type === "link" && linkUrl) {
    try {
      const { result } = await ogs({ url: linkUrl, timeout: 5000 });
      linkPreviewTitle = result.ogTitle ?? null;
      linkPreviewDescription = result.ogDescription ?? null;
      const img = result.ogImage?.[0];
      linkPreviewImage = img?.url ?? null;
    } catch { /* proceed without preview */ }
  }

  const [community] = await db.select({ name: communities.name }).from(communities).where(eq(communities.id, communityId));
  if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

  const id = nanoid();
  const [post] = await db.insert(posts).values({
    id,
    title: title.trim(),
    type,
    content: content ?? null,
    imageUrl: imageUrl ?? null,
    linkUrl: linkUrl ?? null,
    linkPreviewTitle,
    linkPreviewDescription,
    linkPreviewImage,
    authorId: session.user.id,
    communityId,
    flairId: flairId ?? null,
  }).returning();

  await enqueueSyncPost(id);

  return NextResponse.json({ post, communityName: community.name }, { status: 201 });
}
