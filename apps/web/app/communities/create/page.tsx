"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function CreateCommunityPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/communities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, displayName, description }),
    });

    if (!res.ok) {
      const data = await res.json() as { error: string };
      setError(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    router.push(`/u/${name}`);
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Create a community</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Name</label>
          <div className="flex items-center rounded-md border border-border bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground mr-1">u/</span>
            <input
              className="flex-1 bg-transparent outline-none"
              placeholder="community_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              pattern="[a-zA-Z0-9_]{3,21}"
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">3–21 characters, letters, numbers, underscores only. Cannot be changed.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Display name</label>
          <input
            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="My Community"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
          <textarea
            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary resize-none"
            rows={3}
            placeholder="What is your community about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create community"}
          </Button>
        </div>
      </form>
    </main>
  );
}
