import { notFound } from "next/navigation";
import { db } from "@repo/db/client";
import { communities, communityMembers, communityRules, flairs, recentCommunities } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Feed } from "@/components/feed/feed";
import { CommunitySidebar } from "@/components/community/community-sidebar";
import { CommunityHeader } from "@/components/community/community-header";

async function getCommunity(name: string) {
  const [community] = await db
    .select()
    .from(communities)
    .where(eq(communities.name, name));
  return community ?? null;
}

export default async function CommunityPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const community = await getCommunity(name);
  if (!community) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;

  // Check membership
  let isMember = false;
  if (userId) {
    const [membership] = await db
      .select()
      .from(communityMembers)
      .where(and(eq(communityMembers.communityId, community.id), eq(communityMembers.userId, userId)));
    isMember = !!membership;

    // Upsert recent community
    await db
      .insert(recentCommunities)
      .values({ userId, communityId: community.id })
      .onConflictDoUpdate({
        target: [recentCommunities.userId, recentCommunities.communityId],
        set: { visitedAt: new Date() },
      });
  }

  const rules = await db.select().from(communityRules).where(eq(communityRules.communityId, community.id)).orderBy(communityRules.order);
  const communityFlairs = await db.select().from(flairs).where(eq(flairs.communityId, community.id));

  return (
    <div>
      <CommunityHeader community={community} isMember={isMember} userId={userId} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex gap-6">
          <div className="min-w-0 flex-1">
            <Feed communityId={community.id} />
          </div>
          <div className="hidden lg:block">
            <CommunitySidebar community={community} rules={rules} flairs={communityFlairs} isMember={isMember} userId={userId} />
          </div>
        </div>
      </main>
    </div>
  );
}
