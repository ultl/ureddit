import { notFound } from "next/navigation";
import { db } from "@repo/db/client";
import { comments, users, commentVotes, posts, communities } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { CommentItem } from "@/components/comments/comment-item";
import type { CommentNode } from "@/components/comments/comment-list";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

async function getCommentTree(rootId: string, postId: string, userId?: string): Promise<CommentNode | null> {
  // Fetch all comments for the post to build the sub-tree
  const allComments = await db
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
    .where(eq(comments.postId, postId));

  let userVotes: Record<string, number> = {};
  if (userId && allComments.length > 0) {
    const ids = allComments.map((c) => c.id) as [string, ...string[]];
    const { inArray } = await import("drizzle-orm");
    const votes = await db
      .select({ commentId: commentVotes.commentId, value: commentVotes.value })
      .from(commentVotes)
      .where(and(eq(commentVotes.userId, userId), inArray(commentVotes.commentId, ids)));
    userVotes = Object.fromEntries(votes.map((v) => [v.commentId, v.value]));
  }

  const map = new Map<string, CommentNode>();
  allComments.forEach((c) => map.set(c.id, { ...c, userVote: userVotes[c.id] ?? 0, children: [] }));
  allComments.forEach((c) => {
    if (c.parentId && map.has(c.parentId)) map.get(c.parentId)!.children.push(map.get(c.id)!);
  });

  return map.get(rootId) ?? null;
}

export default async function SubThreadPage({
  params,
}: {
  params: Promise<{ name: string; postId: string; commentId: string }>;
}) {
  const { name, postId, commentId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const [postRow] = await db
    .select({ id: posts.id, title: posts.title })
    .from(posts)
    .where(eq(posts.id, postId));
  if (!postRow) notFound();

  const root = await getCommentTree(commentId, postId, session?.user?.id);
  if (!root) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <Link
        href={`/u/${name}/comments/${postId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to {postRow.title}
      </Link>
      <div className="rounded-lg border border-border bg-card p-4">
        <CommentItem
          comment={root}
          postId={postId}
          communityName={name}
          onNewComment={() => {}}
        />
      </div>
    </main>
  );
}
