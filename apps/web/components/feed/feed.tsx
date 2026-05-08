"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { PostCard, type PostItem } from "./post-card";
import { Loader2, LayoutList, AlignJustify } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";

type FeedResponse = {
  posts: PostItem[];
  nextCursor: string | null;
};

type Props = {
  communityId?: string;
};

const SORTS = [
  { label: "New", value: "new" },
  { label: "Top", value: "top" },
] as const;

type Sort = (typeof SORTS)[number]["value"];
type ViewMode = "card" | "compact";

async function fetchPosts(sort: Sort, communityId: string | undefined, cursor: string | undefined): Promise<FeedResponse> {
  const params = new URLSearchParams({ sort });
  if (communityId) params.set("communityId", communityId);
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`/api/posts?${params}`);
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
}

function useLocalStorage<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initial;
    } catch {
      return initial;
    }
  });

  function set(v: T) {
    setValue(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
  }

  return [value, set];
}

export function Feed({ communityId }: Props) {
  const [sort, setSort] = useState<Sort>("new");
  const [view, setView] = useLocalStorage<ViewMode>("feed-view", "card");
  const sentinelRef = useRef<HTMLDivElement>(null);

  const queryKey = ["posts", sort, communityId] as unknown[];

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam }) => fetchPosts(sort, communityId, pageParam as string | undefined),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    });

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const allPosts = data?.pages.flatMap((p) => p.posts) ?? [];

  return (
    <div className="space-y-3">
      <Card size="sm" className="flex-row items-center gap-2 px-3 py-2">
        <Tabs value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <TabsList>
            {SORTS.map((s) => (
              <TabsTrigger key={s.value} value={s.value}>
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <ToggleGroup
          value={[view]}
          onValueChange={(v) => {
            const next = Array.isArray(v) ? v[0] : v;
            if (next) setView(next as ViewMode);
          }}
          className="ml-auto"
        >
          <ToggleGroupItem value="card" aria-label="Card view">
            <LayoutList className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="compact" aria-label="Compact view">
            <AlignJustify className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </Card>

      {status === "pending" && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}
      {status === "error" && (
        <p className="py-8 text-center text-sm text-muted-foreground">Failed to load posts.</p>
      )}
      {status === "success" && allPosts.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">No posts yet.</p>
      )}

      <div className="space-y-2">
        {allPosts.map((post) => (
          <PostCard key={post.id} post={post} compact={view === "compact"} queryKey={queryKey} />
        ))}
      </div>

      <div ref={sentinelRef} />
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
