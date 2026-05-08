import { NextResponse } from "next/server";
import { db } from "@repo/db/client";
import { notifications, users, posts, comments, communities } from "@repo/db/schema";
import { eq, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = alias(users, "actor");

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      read: notifications.read,
      createdAt: notifications.createdAt,
      actorId: notifications.actorId,
      actorName: actor.name,
      actorImage: actor.image,
      postId: notifications.postId,
      postTitle: posts.title,
      commentId: notifications.commentId,
      commentContent: comments.content,
      communityName: communities.name,
    })
    .from(notifications)
    .innerJoin(actor, eq(notifications.actorId, actor.id))
    .leftJoin(posts, eq(notifications.postId, posts.id))
    .leftJoin(comments, eq(notifications.commentId, comments.id))
    .leftJoin(communities, eq(posts.communityId, communities.id))
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(100);

  return NextResponse.json(rows);
}
