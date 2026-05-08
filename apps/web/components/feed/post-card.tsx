"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowUp, ArrowDown, MessageSquare, Bookmark, EyeOff, Share2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type PostItem = {
  id: string;
  title: string;
  type: "text" | "image" | "link";
  content: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkPreviewTitle: string | null;
  linkPreviewImage: string | null;
  score: number;
  commentCount: number;
  createdAt: string | Date;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  communityId: string;
  communityName: string;
  communityDisplayName: string;
  communityIcon: string | null;
  flairId: string | null;
  flairName: string | null;
  flairColor: string | null;
  userVote: number;
};

type Props = {
  post: PostItem;
  compact?: boolean;
  queryKey?: unknown[];
};

async function vote(postId: string, value: number) {
  const res = await fetch(`/api/posts/${postId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error("Vote failed");
  return res.json();
}

async function savePost(postId: string) {
  await fetch(`/api/posts/${postId}/save`, { method: "POST" });
}

async function hidePost(postId: string) {
  await fetch(`/api/posts/${postId}/hide`, { method: "POST" });
}

export function PostCard({ post, compact = false, queryKey }: Props) {
  const qc = useQueryClient();

  const voteMutation = useMutation({
    mutationFn: (value: number) => vote(post.id, value),
    onMutate: async (value) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueriesData({ queryKey });
      qc.setQueriesData({ queryKey }, (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const data = old as { pages: { posts: PostItem[] }[] };
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            posts: page.posts.map((p) => {
              if (p.id !== post.id) return p;
              const prev = p.userVote;
              const next = prev === value ? 0 : value;
              const scoreDelta = next - prev;
              return { ...p, score: p.score + scoreDelta, userVote: next };
            }),
          })),
        };
      });
      return { previous };
    },
    onError: (_err, _val, ctx) => {
      if (ctx?.previous) {
        ctx.previous.forEach(([key, val]) => qc.setQueryData(key, val));
      }
    },
  });

  const hideMutation = useMutation({
    mutationFn: () => hidePost(post.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Post hidden");
    },
  });

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  const meta = (
    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
      <Link
        href={`/u/${post.communityName}`}
        className="font-medium text-foreground hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        u/{post.communityName}
      </Link>
      <span>·</span>
      <span>Posted by</span>
      <Link
        href={`/user/${post.authorName}`}
        className="hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {post.authorName}
      </Link>
      <span>·</span>
      <span>{timeAgo}</span>
      {post.flairName && (
        <Badge
          className="ml-1 text-white border-transparent"
          style={{ backgroundColor: post.flairColor ?? "var(--primary)" }}
        >
          {post.flairName}
        </Badge>
      )}
    </div>
  );

  if (compact) {
    return (
      <Card size="sm" className="flex-row items-start gap-2 px-3 py-2 hover:ring-primary/40 transition-all">
        <div className="flex flex-col items-center gap-0.5 pt-0.5">
          <button
            type="button"
            onClick={() => voteMutation.mutate(1)}
            className={cn("rounded p-0.5 hover:text-orange-500 transition-colors", post.userVote === 1 && "text-orange-500")}
            aria-label="Upvote"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs font-semibold leading-none">{post.score}</span>
          <button
            type="button"
            onClick={() => voteMutation.mutate(-1)}
            className={cn("rounded p-0.5 hover:text-blue-500 transition-colors", post.userVote === -1 && "text-blue-500")}
            aria-label="Downvote"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/posts/${post.id}`} className="text-sm font-medium hover:underline line-clamp-1">
            {post.title}
          </Link>
          {meta}
        </div>
        <Link href={`/posts/${post.id}`} className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground hover:text-foreground">
          <MessageSquare className="h-3 w-3" />
          {post.commentCount}
        </Link>
      </Card>
    );
  }

  return (
    <Card size="sm" className="hover:ring-primary/40 transition-all">
      <div className="flex gap-2 px-3">
        <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => voteMutation.mutate(1)}
                  className={cn("rounded p-1 hover:bg-orange-500/10 hover:text-orange-500 transition-colors", post.userVote === 1 && "text-orange-500")}
                  aria-label="Upvote"
                />
              }
            >
              <ArrowUp className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>Upvote</TooltipContent>
          </Tooltip>
          <span className="text-xs font-bold">{post.score}</span>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => voteMutation.mutate(-1)}
                  className={cn("rounded p-1 hover:bg-blue-500/10 hover:text-blue-500 transition-colors", post.userVote === -1 && "text-blue-500")}
                  aria-label="Downvote"
                />
              }
            >
              <ArrowDown className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>Downvote</TooltipContent>
          </Tooltip>
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          {meta}

          <Link href={`/posts/${post.id}`} className="block">
            <h2 className="text-sm font-semibold leading-snug hover:text-primary transition-colors">
              {post.title}
            </h2>
          </Link>

          {post.type === "text" && post.content && (
            <p className="line-clamp-3 text-xs text-muted-foreground">
              {(() => {
                try {
                  const parsed = JSON.parse(post.content);
                  return parsed?.content?.[0]?.content?.[0]?.text ?? "";
                } catch {
                  return post.content;
                }
              })()}
            </p>
          )}

          {post.type === "image" && post.imageUrl && (
            <Link href={`/posts/${post.id}`}>
              <img
                src={post.imageUrl}
                alt={post.title}
                className="mt-2 max-h-96 w-full rounded object-cover"
              />
            </Link>
          )}

          {post.type === "link" && post.linkUrl && (
            <a
              href={post.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded border border-border bg-muted p-2 text-xs text-muted-foreground hover:bg-accent transition-colors"
            >
              {post.linkPreviewImage && (
                <img src={post.linkPreviewImage} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
              )}
              <span className="min-w-0 flex-1 truncate">{post.linkPreviewTitle ?? post.linkUrl}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          )}

          <div className="flex items-center gap-1 pt-1">
            <Link href={`/posts/${post.id}`}>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                {post.commentCount} comments
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`);
                toast.success("Link copied");
              }}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground"
              onClick={() => {
                savePost(post.id);
                toast.success("Post saved");
              }}
            >
              <Bookmark className="h-3.5 w-3.5" />
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground"
              onClick={() => hideMutation.mutate()}
            >
              <EyeOff className="h-3.5 w-3.5" />
              Hide
            </Button>
          </div>
        </div>

        {post.type === "link" && post.linkPreviewImage && (
          <a
            href={post.linkUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 hidden sm:block"
          >
            <img
              src={post.linkPreviewImage}
              alt=""
              className="h-20 w-20 rounded object-cover"
            />
          </a>
        )}
      </div>
    </Card>
  );
}
