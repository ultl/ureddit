import { notFound } from "next/navigation";
import { db } from "@repo/db/client";
import { posts, users, communities, flairs, postVotes } from "@repo/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { PostDetail } from "@/components/post/post-detail";
import { CommentList } from "@/components/comments/comment-list";

async function getPost(postId: string, userId?: string) {
  const [row] = await db
    .select({
      id: posts.id,
      title: posts.title,
      type: posts.type,
      content: posts.content,
      imageUrl: posts.imageUrl,
      linkUrl: posts.linkUrl,
      linkPreviewTitle: posts.linkPreviewTitle,
      linkPreviewDescription: posts.linkPreviewDescription,
      linkPreviewImage: posts.linkPreviewImage,
      score: posts.score,
      commentCount: posts.commentCount,
      createdAt: posts.createdAt,
      authorName: users.name,
      authorImage: users.image,
      communityName: communities.name,
      flairName: flairs.name,
      flairColor: flairs.color,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .innerJoin(communities, eq(posts.communityId, communities.id))
    .leftJoin(flairs, eq(posts.flairId, flairs.id))
    .where(eq(posts.id, postId));

  if (!row) return null;

  let userVote = 0;
  if (userId) {
    const [vote] = await db
      .select({ value: postVotes.value })
      .from(postVotes)
      .where(and(eq(postVotes.postId, postId), eq(postVotes.userId, userId)));
    userVote = vote?.value ?? 0;
  }

  return { ...row, userVote };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ name: string; postId: string }>;
}) {
  const { postId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const post = await getPost(postId, session?.user?.id);

  if (!post) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <PostDetail post={post} />
      <CommentList postId={post.id} communityName={post.communityName} />
    </main>
  );
}
