"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, Share2, Bookmark, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TiptapViewer } from "@/components/editor/tiptap-viewer";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import type { CommentNode } from "./comment-list";
import { CommentForm } from "./comment-form";
import { toast } from "sonner";

type Props = {
  comment: CommentNode;
  postId: string;
  communityName: string;
  onNewComment: (c: CommentNode) => void;
};

const MAX_DEPTH = 6;

export function CommentItem({ comment, postId, communityName, onNewComment }: Props) {
  const [score, setScore] = useState(comment.score);
  const [userVote, setUserVote] = useState(comment.userVote);
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);

  async function handleVote(value: number) {
    const res = await fetch(`/api/comments/${comment.id}/vote`, {
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

  const isValidJson = (s: string) => {
    try {
      JSON.parse(s);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="group">
      <div className="flex gap-2">
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={collapsed ? "Expand thread" : "Collapse thread"}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {!collapsed && comment.children.length > 0 && (
            <div
              className="mt-1 flex-1 w-px bg-border hover:bg-primary cursor-pointer transition-colors"
              onClick={() => setCollapsed(true)}
            />
          )}
        </div>

        <div className="min-w-0 flex-1 pb-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Avatar size="sm" className="size-5">
              {comment.authorImage && <AvatarImage src={comment.authorImage} alt="" />}
              <AvatarFallback className="text-[10px]">
                {comment.authorName.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Link href={`/user/${comment.authorName}`} className="font-semibold text-foreground hover:underline">
              {comment.authorName}
            </Link>
            <span>·</span>
            <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
            <span
              className={cn(
                "font-semibold ml-1",
                score > 0 && "text-orange-500",
                score < 0 && "text-blue-500",
              )}
            >
              {score > 0 ? `+${score}` : score}
            </span>
          </div>

          {!collapsed && (
            <>
              <div className="text-sm mb-1.5">
                {isValidJson(comment.content) ? (
                  <TiptapViewer content={comment.content} />
                ) : (
                  <p>{comment.content}</p>
                )}
              </div>

              <div className="flex items-center gap-0.5 -ml-1.5">
                <button
                  type="button"
                  onClick={() => handleVote(1)}
                  className={cn(
                    "rounded p-1 hover:text-orange-500 transition-colors",
                    userVote === 1 && "text-orange-500",
                  )}
                  aria-label="Upvote"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleVote(-1)}
                  className={cn(
                    "rounded p-1 hover:text-blue-500 transition-colors",
                    userVote === -1 && "text-blue-500",
                  )}
                  aria-label="Downvote"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground"
                  onClick={() => setReplying(!replying)}
                >
                  Reply
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/u/${communityName}/comments/${postId}/${comment.id}`,
                    );
                    toast.success("Link copied");
                  }}
                >
                  <Share2 className="size-3" />
                  Share
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground"
                  onClick={() => {
                    fetch(`/api/comments/${comment.id}/save`, { method: "POST" });
                    toast.success("Comment saved");
                  }}
                >
                  <Bookmark className="size-3" />
                  Save
                </Button>
              </div>

              {replying && (
                <div className="mt-2">
                  <CommentForm
                    postId={postId}
                    parentId={comment.id}
                    onSubmit={(newComment) => {
                      onNewComment(newComment);
                      setReplying(false);
                    }}
                    onCancel={() => setReplying(false)}
                  />
                </div>
              )}

              {comment.depth < MAX_DEPTH
                ? comment.children.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {comment.children.map((child) => (
                        <CommentItem
                          key={child.id}
                          comment={child}
                          postId={postId}
                          communityName={communityName}
                          onNewComment={onNewComment}
                        />
                      ))}
                    </div>
                  )
                : comment.children.length > 0 && (
                    <Link
                      href={`/u/${communityName}/comments/${postId}/${comment.id}`}
                      className="mt-2 block text-xs text-primary hover:underline"
                    >
                      Continue this thread →
                    </Link>
                  )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
