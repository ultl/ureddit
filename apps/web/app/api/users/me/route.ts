import { NextRequest, NextResponse } from "next/server";
import { db } from "@repo/db/client";
import { users } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { enqueueSyncUser } from "@repo/db/queue";
import { meili } from "@repo/db/search";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type Body = {
  name?: string;
  bio?: string | null;
  image?: string | null;
  banner?: string | null;
};

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = (await req.json()) as Body;

  const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (trimmed.length < 1 || trimmed.length > 32) {
      return NextResponse.json({ error: "Name must be 1–32 characters" }, { status: 400 });
    }
    patch.name = trimmed;
  }
  if (body.bio !== undefined) patch.bio = body.bio;
  if (body.image !== undefined) patch.image = body.image;
  if (body.banner !== undefined) patch.banner = body.banner;

  const [updated] = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      name: users.name,
      image: users.image,
      banner: users.banner,
      bio: users.bio,
    });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await enqueueSyncUser(userId);

  return NextResponse.json(updated);
}

export async function DELETE() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  await db.delete(users).where(eq(users.id, userId));
  try {
    await meili.index("users").deleteDocument(userId);
  } catch {
    // best-effort; document may not have been indexed yet
  }

  return NextResponse.json({ ok: true });
}
