"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { PostCard, type PostItem } from "./post-card";
import { Loader2, LayoutList, AlignJustify } from "lucide-react";
import { cn } from "@/lib/utils";

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
      {/* Toolbar: sort + view toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5">
        {SORTS.map((s) => (
          <button
            key={s.value}
            onClick={() => setSort(s.value)}
            className={cn(
              "rounded px-3 py-1 text-sm font-medium transition-colors",
              sort === s.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {s.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setView("card")}
            className={cn("rounded p-1.5 transition-colors", view === "card" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted")}
            title="Card view"
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("compact")}
            className={cn("rounded p-1.5 transition-colors", view === "compact" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted")}
            title="Compact view"
          >
            <AlignJustify className="h-4 w-4" />
          </button>
        </div>
      </div>

      {status === "pending" && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
