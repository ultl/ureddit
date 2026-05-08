"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, Bookmark, EyeOff, Share2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TiptapViewer } from "@/components/editor/tiptap-viewer";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Post = {
  id: string;
  title: string;
  type: "text" | "image" | "link";
  content: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkPreviewTitle: string | null;
  linkPreviewDescription: string | null;
  linkPreviewImage: string | null;
  score: number;
  commentCount: number;
  createdAt: Date;
  authorName: string;
  authorImage: string | null;
  communityName: string;
  flairName: string | null;
  flairColor: string | null;
  userVote: number;
};

type Props = { post: Post };

export function PostDetail({ post: initial }: Props) {
  const [score, setScore] = useState(initial.score);
  const [userVote, setUserVote] = useState(initial.userVote);
  const router = useRouter();

  async function handleVote(value: number) {
    const res = await fetch(`/api/posts/${initial.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (!res.ok) return;
    const prev = userVote;
    const next = prev === value ? 0 : value;
    setScore(score + (next - prev));
    setUserVote(next);
  }

  async function handleHide() {
    await fetch(`/api/posts/${initial.id}/hide`, { method: "POST" });
    router.push("/");
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex gap-3 p-4">
        {/* Vote column */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            onClick={() => handleVote(1)}
            className={cn("rounded p-1 hover:bg-orange-500/10 hover:text-orange-500 transition-colors", userVote === 1 && "text-orange-500")}
          >
            <ArrowUp className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold">{score}</span>
          <button
            onClick={() => handleVote(-1)}
            className={cn("rounded p-1 hover:bg-blue-500/10 hover:text-blue-500 transition-colors", userVote === -1 && "text-blue-500")}
          >
            <ArrowDown className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-3">
          {/* Meta */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
            <Link href={`/u/${initial.communityName}`} className="font-semibold text-foreground hover:underline">
              u/{initial.communityName}
            </Link>
            <span>·</span>
            <span>Posted by</span>
            <Link href={`/user/${initial.authorName}`} className="hover:underline">
              {initial.authorName}
            </Link>
            <span>·</span>
            <span>{formatDistanceToNow(new Date(initial.createdAt), { addSuffix: true })}</span>
            {initial.flairName && (
              <>
                <span>·</span>
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                  style={{ backgroundColor: initial.flairColor ?? "#6366f1" }}
                >
                  {initial.flairName}
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold leading-snug">{initial.title}</h1>

          {/* Body */}
          {initial.type === "text" && initial.content && (
            <div className="text-sm">
              <TiptapViewer content={initial.content} />
            </div>
          )}

          {initial.type === "image" && initial.imageUrl && (
            <img
              src={initial.imageUrl}
              alt={initial.title}
              className="max-h-[600px] w-full rounded-md object-contain bg-muted"
            />
          )}

          {initial.type === "link" && initial.linkUrl && (
            <a
              href={initial.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-md border border-border bg-muted p-3 hover:bg-accent transition-colors"
            >
              {initial.linkPreviewImage && (
                <img
                  src={initial.linkPreviewImage}
                  alt=""
                  className="h-20 w-20 rounded object-cover shrink-0"
                />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium line-clamp-2">
                  {initial.linkPreviewTitle ?? initial.linkUrl}
                </p>
                {initial.linkPreviewDescription && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {initial.linkPreviewDescription}
                  </p>
                )}
                <p className="text-xs text-muted-foreground truncate">{initial.linkUrl}</p>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
            </a>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-1 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 h-7 text-xs text-muted-foreground"
              onClick={() => navigator.clipboard.writeText(window.location.href)}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 h-7 text-xs text-muted-foreground"
              onClick={async () => {
                await fetch(`/api/posts/${initial.id}/save`, { method: "POST" });
              }}
            >
              <Bookmark className="h-3.5 w-3.5" />
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 h-7 text-xs text-muted-foreground"
              onClick={handleHide}
            >
              <EyeOff className="h-3.5 w-3.5" />
              Hide
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
