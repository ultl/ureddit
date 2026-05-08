"use client";

import { useEffect, useState } from "react";
import { useSubscribeCommunity } from "@/providers/sse-provider";

type Props = { communityId: string; communityName: string };

const POLL_INTERVAL_MS = 30_000;

export function CommunityOnline({ communityId, communityName }: Props) {
  const [count, setCount] = useState<number | null>(null);

  useSubscribeCommunity(communityId);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/communities/${communityName}/online`);
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { count: number };
      if (!cancelled) setCount(data.count);
    }
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [communityName]);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="font-semibold">{(count ?? 0).toLocaleString()}</span>
      <span className="text-muted-foreground">online</span>
    </div>
  );
}
