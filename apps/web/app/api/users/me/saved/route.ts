import { NextResponse } from "next/server";
import { db } from "@repo/db/client";
import {
  posts,
  comments,
  communities,
  users,
  postVotes,
  savedPosts,
  savedComments,
  flairs,
} from "@repo/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const LIMIT = 25;

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const author = alias(users, "post_author");

  const postRows = await db
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
      authorName: author.name,
      authorImage: author.image,
      communityId: posts.communityId,
      communityName: communities.name,
      communityDisplayName: communities.displayName,
      communityIcon: communities.icon,
      flairId: posts.flairId,
      flairName: flairs.name,
      flairColor: flairs.color,
      savedAt: savedPosts.savedAt,
    })
    .from(savedPosts)
    .innerJoin(posts, eq(savedPosts.postId, posts.id))
    .innerJoin(author, eq(posts.authorId, author.id))
    .innerJoin(communities, eq(posts.communityId, communities.id))
    .leftJoin(flairs, eq(posts.flairId, flairs.id))
    .where(eq(savedPosts.userId, userId))
    .orderBy(desc(savedPosts.savedAt))
    .limit(LIMIT);

  let userVotes: Record<string, number> = {};
  if (postRows.length > 0) {
    const ids = postRows.map((r) => r.id) as [string, ...string[]];
    const votes = await db
      .select({ postId: postVotes.postId, value: postVotes.value })
      .from(postVotes)
      .where(and(eq(postVotes.userId, userId), inArray(postVotes.postId, ids)));
    userVotes = Object.fromEntries(votes.map((v) => [v.postId, v.value]));
  }

  const savedPostsOut = postRows.map((r) => ({ ...r, userVote: userVotes[r.id] ?? 0 }));

  const commentAuthor = alias(users, "comment_author");

  const commentRows = await db
    .select({
      id: comments.id,
      content: comments.content,
      score: comments.score,
      createdAt: comments.createdAt,
      postId: comments.postId,
      postTitle: posts.title,
      communityName: communities.name,
      authorName: commentAuthor.name,
      savedAt: savedComments.savedAt,
    })
    .from(savedComments)
    .innerJoin(comments, eq(savedComments.commentId, comments.id))
    .innerJoin(commentAuthor, eq(comments.authorId, commentAuthor.id))
    .innerJoin(posts, eq(comments.postId, posts.id))
    .innerJoin(communities, eq(posts.communityId, communities.id))
    .where(eq(savedComments.userId, userId))
    .orderBy(desc(savedComments.savedAt))
    .limit(LIMIT);

  return NextResponse.json({ posts: savedPostsOut, comments: commentRows });
}
