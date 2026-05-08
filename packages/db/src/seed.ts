import { faker } from "@faker-js/faker";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema";

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

function id() {
  return crypto.randomUUID();
}

async function seed() {
  console.log("🌱 Seeding database...");

  // Clean existing data in FK-safe order
  console.log("Clearing existing data...");
  await db.delete(schema.notifications);
  await db.delete(schema.recentCommunities);
  await db.delete(schema.hiddenPosts);
  await db.delete(schema.savedComments);
  await db.delete(schema.savedPosts);
  await db.delete(schema.commentVotes);
  await db.delete(schema.comments);
  await db.delete(schema.postVotes);
  await db.delete(schema.posts);
  await db.delete(schema.flairs);
  await db.delete(schema.communityRules);
  await db.delete(schema.communityMembers);
  await db.delete(schema.communities);
  await db.delete(schema.verifications);
  await db.delete(schema.sessions);
  await db.delete(schema.accounts);
  await db.delete(schema.users);

  // ── Users ────────────────────────────────────────────────────────────────
  console.log("Creating 20 users...");
  const userIds: string[] = [];

  for (let i = 0; i < 20; i++) {
    const uid = id();
    userIds.push(uid);
    await db.insert(schema.users).values({
      id: uid,
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      emailVerified: true,
      image: `https://api.dicebear.com/9.x/avataaars/svg?seed=${uid}`,
      bio: faker.lorem.sentence(),
      postKarma: 0,
      commentKarma: 0,
    });
  }

  // ── Communities ───────────────────────────────────────────────────────────
  console.log("Creating 5 communities...");

  const communityData = [
    { name: "technology", displayName: "Technology", description: "All things tech — gadgets, software, and the future." },
    { name: "gaming", displayName: "Gaming", description: "Video games, board games, and everything in between." },
    { name: "science", displayName: "Science", description: "Discoveries, research, and the wonders of the universe." },
    { name: "photography", displayName: "Photography", description: "Share your shots and discuss the art of photography." },
    { name: "movies", displayName: "Movies", description: "Reviews, discussions, and news about film." },
  ];

  const communityIds: string[] = [];
  const flairIdsByCommunity: Record<string, string[]> = {};

  for (const [i, data] of communityData.entries()) {
    const cid = id();
    communityIds.push(cid);
    const creatorId = userIds[i % userIds.length]!;

    await db.insert(schema.communities).values({
      id: cid,
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      icon: `https://api.dicebear.com/9.x/identicon/svg?seed=${data.name}`,
      banner: `https://picsum.photos/seed/${data.name}/1200/300`,
      creatorId,
      memberCount: 0,
    });

    // Rules
    const rules = [
      { title: "Be respectful", description: "Treat others as you'd like to be treated." },
      { title: "Stay on topic", description: "Keep posts relevant to this community." },
      { title: "No spam", description: "Promotional content must be relevant and limited." },
    ];
    for (const [order, rule] of rules.entries()) {
      await db.insert(schema.communityRules).values({
        id: id(),
        communityId: cid,
        title: rule.title,
        description: rule.description,
        order,
      });
    }

    // Flairs
    const flairColors = ["#FF4500", "#0079D3", "#46D160", "#FFD635", "#EA0027"];
    const flairNames = ["Discussion", "News", "Question", "Tutorial", "Showcase"];
    const communityFlairIds: string[] = [];
    for (let f = 0; f < 3; f++) {
      const fid = id();
      communityFlairIds.push(fid);
      await db.insert(schema.flairs).values({
        id: fid,
        communityId: cid,
        name: flairNames[f]!,
        color: flairColors[f]!,
      });
    }
    flairIdsByCommunity[cid] = communityFlairIds;
  }

  // ── Community members ─────────────────────────────────────────────────────
  console.log("Adding community members...");
  const memberCounts: Record<string, number> = {};
  for (const cid of communityIds) {
    memberCounts[cid] = 0;
  }

  for (const uid of userIds) {
    // Each user joins 2–4 random communities
    const shuffled = [...communityIds].sort(() => Math.random() - 0.5);
    const toJoin = shuffled.slice(0, faker.number.int({ min: 2, max: 4 }));
    for (const cid of toJoin) {
      await db.insert(schema.communityMembers).values({
        communityId: cid,
        userId: uid,
        joinedAt: faker.date.past({ years: 1 }),
      });
      memberCounts[cid]!++;
    }
  }

  // Update member counts
  for (const [cid, count] of Object.entries(memberCounts)) {
    await db
      .update(schema.communities)
      .set({ memberCount: count })
      .where(eq(schema.communities.id, cid));
  }

  // ── Posts ─────────────────────────────────────────────────────────────────
  console.log("Creating 50 posts...");
  const postIds: string[] = [];

  for (let i = 0; i < 50; i++) {
    const pid = id();
    postIds.push(pid);
    const communityId = communityIds[i % communityIds.length]!;
    const authorId = userIds[faker.number.int({ min: 0, max: userIds.length - 1 })]!;
    const flairIds = flairIdsByCommunity[communityId] ?? [];
    const flairId = flairIds.length > 0 && Math.random() > 0.3
      ? flairIds[faker.number.int({ min: 0, max: flairIds.length - 1 })]
      : undefined;

    const type = i % 3 === 0 ? "image" : i % 3 === 1 ? "link" : "text";

    await db.insert(schema.posts).values({
      id: pid,
      title: faker.lorem.sentence({ min: 5, max: 12 }),
      content: type === "text" ? JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: faker.lorem.paragraphs(2) }] }] }) : null,
      type,
      imageUrl: type === "image" ? `https://picsum.photos/seed/${pid}/800/600` : null,
      linkUrl: type === "link" ? faker.internet.url() : null,
      linkPreviewTitle: type === "link" ? faker.lorem.sentence() : null,
      linkPreviewDescription: type === "link" ? faker.lorem.sentence() : null,
      linkPreviewImage: type === "link" ? `https://picsum.photos/seed/${pid}-link/600/400` : null,
      authorId,
      communityId,
      flairId: flairId ?? null,
      score: 0,
      commentCount: 0,
      createdAt: faker.date.recent({ days: 30 }),
    });
  }

  // ── Post votes ────────────────────────────────────────────────────────────
  console.log("Adding votes to posts...");
  const postKarmaMap: Record<string, number> = {};

  for (const pid of postIds) {
    const post = await db.query.posts.findFirst({ where: eq(schema.posts.id, pid) });
    if (!post) continue;

    const voters = [...userIds].sort(() => Math.random() - 0.5)
      .slice(0, faker.number.int({ min: 2, max: 15 }));
    let score = 0;

    for (const uid of voters) {
      if (uid === post.authorId) continue;
      const value = Math.random() > 0.25 ? 1 : -1;
      await db.insert(schema.postVotes).values({ postId: pid, userId: uid, value });
      score += value;
      postKarmaMap[post.authorId] = (postKarmaMap[post.authorId] ?? 0) + value;
    }

    await db.update(schema.posts).set({ score }).where(eq(schema.posts.id, pid));
  }

  // ── Comments ──────────────────────────────────────────────────────────────
  console.log("Creating 200 comments...");
  const commentIds: string[] = [];
  const commentKarmaMap: Record<string, number> = {};
  const commentCountMap: Record<string, number> = {};

  for (let i = 0; i < 200; i++) {
    const cid = id();
    commentIds.push(cid);
    const postId = postIds[faker.number.int({ min: 0, max: postIds.length - 1 })]!;
    const authorId = userIds[faker.number.int({ min: 0, max: userIds.length - 1 })]!;

    // 40% chance of being a reply to an existing comment
    let parentId: string | null = null;
    let depth = 0;
    if (i > 10 && Math.random() > 0.6 && commentIds.length > 0) {
      const parentCid = commentIds[faker.number.int({ min: 0, max: commentIds.length - 1 })]!;
      const parent = await db.query.comments.findFirst({ where: eq(schema.comments.id, parentCid) });
      if (parent && parent.depth < 4) {
        parentId = parentCid;
        depth = parent.depth + 1;
      }
    }

    await db.insert(schema.comments).values({
      id: cid,
      content: JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: faker.lorem.sentences(faker.number.int({ min: 1, max: 3 })) }] }] }),
      postId,
      authorId,
      parentId,
      depth,
      score: 0,
      createdAt: faker.date.recent({ days: 30 }),
    });

    commentCountMap[postId] = (commentCountMap[postId] ?? 0) + 1;
  }

  // Update comment counts in batch
  for (const [postId, count] of Object.entries(commentCountMap)) {
    await db.update(schema.posts).set({ commentCount: count }).where(eq(schema.posts.id, postId));
  }

  // ── Comment votes ─────────────────────────────────────────────────────────
  console.log("Adding votes to comments...");
  for (const cid of commentIds) {
    const comment = await db.query.comments.findFirst({ where: eq(schema.comments.id, cid) });
    if (!comment) continue;

    const voters = [...userIds].sort(() => Math.random() - 0.5)
      .slice(0, faker.number.int({ min: 0, max: 8 }));
    let score = 0;

    for (const uid of voters) {
      if (uid === comment.authorId) continue;
      const value = Math.random() > 0.2 ? 1 : -1;
      await db.insert(schema.commentVotes).values({ commentId: cid, userId: uid, value });
      score += value;
      commentKarmaMap[comment.authorId] = (commentKarmaMap[comment.authorId] ?? 0) + value;
    }

    await db.update(schema.comments).set({ score }).where(eq(schema.comments.id, cid));
  }

  // ── Update karma ──────────────────────────────────────────────────────────
  console.log("Updating karma...");
  for (const [uid, karma] of Object.entries(postKarmaMap)) {
    await db.update(schema.users)
      .set({ postKarma: Math.max(0, karma) })
      .where(eq(schema.users.id, uid));
  }
  for (const [uid, karma] of Object.entries(commentKarmaMap)) {
    await db.update(schema.users)
      .set({ commentKarma: Math.max(0, karma) })
      .where(eq(schema.users.id, uid));
  }

  console.log("✅ Seeding complete!");
  await sql.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
