import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { createRedisClient } from "./redis";
import { meili } from "./search";
import { db } from "./client";
import { posts, communities, users } from "./schema";
import type { SyncJobData } from "./queue";

const worker = new Worker<SyncJobData>(
  "search-sync",
  async (job) => {
    const { type, id } = job.data;

    if (type === "post") {
      const post = await db.query.posts.findFirst({
        where: eq(posts.id, id),
        with: { author: true, community: true, flair: true },
      });
      if (!post) return;
      await meili.index("posts").addDocuments([{
        id: post.id,
        title: post.title,
        content: post.content ? JSON.parse(post.content) : null,
        type: post.type,
        linkPreviewTitle: post.linkPreviewTitle,
        authorId: post.authorId,
        authorName: post.author.name,
        communityId: post.communityId,
        communityName: post.community.name,
        score: post.score,
        commentCount: post.commentCount,
        createdAt: post.createdAt.toISOString(),
      }]);
    }

    if (type === "community") {
      const community = await db.query.communities.findFirst({
        where: eq(communities.id, id),
      });
      if (!community) return;
      await meili.index("communities").addDocuments([{
        id: community.id,
        name: community.name,
        displayName: community.displayName,
        description: community.description,
        icon: community.icon,
        memberCount: community.memberCount,
        createdAt: community.createdAt.toISOString(),
      }]);
    }

    if (type === "user") {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      if (!user) return;
      await meili.index("users").addDocuments([{
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        postKarma: user.postKarma,
        commentKarma: user.commentKarma,
      }]);
    }
  },
  { connection: createRedisClient() }
);

worker.on("completed", (job) => {
  console.log(`[worker] ${job.data.type}:${job.data.id} synced to Meilisearch`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] failed ${job?.data.type}:${job?.data.id}`, err.message);
});

console.log("[worker] search-sync worker started");
