import { NextRequest, NextResponse } from "next/server";
import { meili } from "@repo/db/search";

const HITS_PER_INDEX = 3;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ posts: [], communities: [], users: [] });
  }

  try {
    const result = await meili.multiSearch({
      queries: [
        { indexUid: "posts", q, limit: HITS_PER_INDEX },
        { indexUid: "communities", q, limit: HITS_PER_INDEX },
        { indexUid: "users", q, limit: HITS_PER_INDEX },
      ],
    });

    const [posts, communities, users] = result.results;
    return NextResponse.json({
      posts: posts?.hits ?? [],
      communities: communities?.hits ?? [],
      users: users?.hits ?? [],
    });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ posts: [], communities: [], users: [] });
  }
}
