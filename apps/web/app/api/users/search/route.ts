import { NextRequest, NextResponse } from "next/server";
import { db } from "@repo/db/client";
import { users } from "@repo/db/schema";
import { ilike } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json([]);

  const rows = await db
    .select({ id: users.id, name: users.name, image: users.image })
    .from(users)
    .where(ilike(users.name, `%${q}%`))
    .limit(8);

  return NextResponse.json(rows);
}
