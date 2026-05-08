import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Feed } from "@/components/feed/feed";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function prefetchFeed(qc: QueryClient) {
  await qc.prefetchInfiniteQuery({
    queryKey: ["posts", "new", undefined],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/posts?sort=new`, { cache: "no-store" });
      return res.json();
    },
    initialPageParam: undefined,
  });
}

export default async function Home() {
  const [session, qc] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    Promise.resolve(new QueryClient()),
  ]);
  await prefetchFeed(qc);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex gap-6">
          <div className="min-w-0 flex-1">
            <Feed />
          </div>
          <div className="hidden md:block">
            <Sidebar userId={session?.user?.id} />
          </div>
        </div>
      </main>
    </HydrationBoundary>
  );
}
