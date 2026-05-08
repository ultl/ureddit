import { NextResponse } from "next/server";
import { db } from "@repo/db/client";
import { communities } from "@repo/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select({ id: communities.id, name: communities.name, displayName: communities.displayName })
    .from(communities)
    .orderBy(asc(communities.name));
  return NextResponse.json(rows);
}
