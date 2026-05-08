import Link from "next/link";
import { db } from "@repo/db/client";
import { communities, recentCommunities } from "@repo/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { Button } from "@/components/ui/button";

async function getTopCommunities() {
  return db
    .select({
      id: communities.id,
      name: communities.name,
      displayName: communities.displayName,
      icon: communities.icon,
      memberCount: communities.memberCount,
    })
    .from(communities)
    .orderBy(desc(communities.memberCount))
    .limit(5);
}

async function getRecentCommunities(userId: string) {
  const recent = await db
    .select({ communityId: recentCommunities.communityId })
    .from(recentCommunities)
    .where(eq(recentCommunities.userId, userId))
    .orderBy(desc(recentCommunities.visitedAt))
    .limit(5);

  if (recent.length === 0) return [];

  const ids = recent.map((r) => r.communityId) as [string, ...string[]];
  const rows = await db
    .select({
      id: communities.id,
      name: communities.name,
      displayName: communities.displayName,
      icon: communities.icon,
    })
    .from(communities)
    .where(inArray(communities.id, ids));

  // Preserve visited order
  return recent.map((r) => rows.find((c) => c.id === r.communityId)).filter(Boolean);
}

type Props = {
  userId?: string;
};

export async function Sidebar({ userId }: Props) {
  const [topCommunities, recentComms] = await Promise.all([
    getTopCommunities(),
    userId ? getRecentCommunities(userId) : Promise.resolve([]),
  ]);

  return (
    <aside className="w-80 shrink-0 space-y-4">
      {/* Home card */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏠</span>
          <span className="font-semibold">Home</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Your personal ureddit frontpage. Come here to check in with your favourite communities.
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/submit">
            <Button className="w-full" size="sm">Create Post</Button>
          </Link>
          <Link href="/communities/create">
            <Button className="w-full" variant="outline" size="sm">Create Community</Button>
          </Link>
        </div>
      </div>

      {/* Recently visited */}
      {recentComms.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-sm">Recent Communities</h3>
          <ul className="space-y-1">
            {recentComms.map((community) => (
              community && (
                <li key={community.id}>
                  <Link
                    href={`/u/${community.name}`}
                    className="flex items-center gap-3 rounded-md p-1.5 hover:bg-muted text-sm transition-colors"
                  >
                    {community.icon ? (
                      <img src={community.icon} alt="" className="h-5 w-5 rounded-full" />
                    ) : (
                      <span className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {community.displayName[0]}
                      </span>
                    )}
                    <span className="font-medium">u/{community.name}</span>
                  </Link>
                </li>
              )
            ))}
          </ul>
        </div>
      )}

      {/* Top communities */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="font-semibold text-sm">Top Communities</h3>
        <ul className="space-y-1">
          {topCommunities.map((community, i) => (
            <li key={community.id}>
              <Link
                href={`/u/${community.name}`}
                className="flex items-center gap-3 rounded-md p-1.5 hover:bg-muted text-sm transition-colors"
              >
                <span className="text-muted-foreground w-4 text-xs">{i + 1}</span>
                {community.icon ? (
                  <img src={community.icon} alt="" className="h-5 w-5 rounded-full" />
                ) : (
                  <span className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {community.displayName[0]}
                  </span>
                )}
                <span className="font-medium">u/{community.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
