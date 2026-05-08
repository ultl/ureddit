import { NextRequest, NextResponse } from "next/server";
import { db } from "@repo/db/client";
import { hiddenPosts } from "@repo/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;
  const userId = session.user.id;

  await db
    .insert(hiddenPosts)
    .values({ postId, userId })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;
  const userId = session.user.id;

  await db.delete(hiddenPosts).where(and(eq(hiddenPosts.postId, postId), eq(hiddenPosts.userId, userId)));

  return NextResponse.json({ ok: true });
}
