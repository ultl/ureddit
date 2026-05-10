"use client";

import { Button } from "@/components/ui/button";

export default function PostError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-center space-y-3">
      <h2 className="text-lg font-semibold">Couldn&rsquo;t load this post</h2>
      <p className="text-sm text-muted-foreground">
        Something went wrong while loading the post or its comments.
      </p>
      <Button size="sm" onClick={reset}>Try again</Button>
    </main>
  );
}
