import Link from "next/link";
import { db } from "@repo/db/client";
import { communities, recentCommunities } from "@repo/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

  return recent.map((r) => rows.find((c) => c.id === r.communityId)).filter(Boolean);
}

type Props = {
  userId?: string;
};

type CommunitySummary = {
  id: string;
  name: string;
  displayName: string;
  icon: string | null;
};

function CommunityRow({ community, rank }: { community: CommunitySummary; rank?: number }) {
  return (
    <Link
      href={`/u/${community.name}`}
      className="flex items-center gap-3 rounded-md p-1.5 hover:bg-muted text-sm transition-colors"
    >
      {rank !== undefined && (
        <span className="text-muted-foreground w-4 text-xs">{rank}</span>
      )}
      <Avatar size="sm">
        {community.icon && <AvatarImage src={community.icon} alt="" />}
        <AvatarFallback className="bg-orange-500 text-white text-[10px] font-bold">
          {community.displayName[0]}
        </AvatarFallback>
      </Avatar>
      <span className="font-medium">u/{community.name}</span>
    </Link>
  );
}

export async function Sidebar({ userId }: Props) {
  const [topCommunities, recentComms] = await Promise.all([
    getTopCommunities(),
    userId ? getRecentCommunities(userId) : Promise.resolve([]),
  ]);

  return (
    <aside className="w-80 shrink-0 space-y-4">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🏠</span>
            Home
          </CardTitle>
          <CardDescription>
            Your personal ureddit frontpage. Come here to check in with your favourite communities.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Link href="/submit">
            <Button className="w-full" size="sm">
              Create Post
            </Button>
          </Link>
          <Link href="/communities/create">
            <Button className="w-full" variant="outline" size="sm">
              Create Community
            </Button>
          </Link>
        </CardContent>
      </Card>

      {recentComms.length > 0 && (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Recent Communities</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {recentComms.map(
                (community) =>
                  community && (
                    <li key={community.id}>
                      <CommunityRow community={community} />
                    </li>
                  ),
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">Top Communities</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1">
            {topCommunities.map((community, i) => (
              <li key={community.id}>
                <CommunityRow community={community} rank={i + 1} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </aside>
  );
}
