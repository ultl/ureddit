/**
 * Enqueue Meilisearch sync jobs for every existing user, community, and post.
 * Run once after seeding (or any time the Meili index needs to be rebuilt
 * from Postgres). The BullMQ worker must be running to drain the queue.
 */
import { db } from "./client";
import { users, communities, posts } from "./schema";
import { enqueueSyncUser, enqueueSyncCommunity, enqueueSyncPost } from "./queue";

async function main() {
  const [allUsers, allCommunities, allPosts] = await Promise.all([
    db.select({ id: users.id }).from(users),
    db.select({ id: communities.id }).from(communities),
    db.select({ id: posts.id }).from(posts),
  ]);

  console.log(`Backfilling: ${allUsers.length} users, ${allCommunities.length} communities, ${allPosts.length} posts`);

  for (const u of allUsers) await enqueueSyncUser(u.id);
  for (const c of allCommunities) await enqueueSyncCommunity(c.id);
  for (const p of allPosts) await enqueueSyncPost(p.id);

  console.log("✅ Enqueued. Worker will drain shortly.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
