"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, Share2, Bookmark, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TiptapViewer } from "@/components/editor/tiptap-viewer";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import type { CommentNode } from "./comment-list";
import { CommentForm } from "./comment-form";

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

  const isValidJson = (s: string) => { try { JSON.parse(s); return true; } catch { return false; } };

  return (
    <div className="group">
      <div className="flex gap-2">
        {/* Collapse button + thread line */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {!collapsed && comment.children.length > 0 && (
            <div className="mt-1 flex-1 w-px bg-border hover:bg-primary cursor-pointer transition-colors" onClick={() => setCollapsed(true)} />
          )}
        </div>

        <div className="min-w-0 flex-1 pb-2">
          {/* Author + time */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Link href={`/user/${comment.authorName}`} className="font-semibold text-foreground hover:underline">
              {comment.authorName}
            </Link>
            <span>·</span>
            <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
            <span className={cn("font-semibold ml-1", score > 0 && "text-orange-500", score < 0 && "text-blue-500")}>
              {score > 0 ? `+${score}` : score}
            </span>
          </div>

          {!collapsed && (
            <>
              {/* Content */}
              <div className="text-sm mb-1.5">
                {isValidJson(comment.content)
                  ? <TiptapViewer content={comment.content} />
                  : <p>{comment.content}</p>
                }
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 -ml-1.5">
                <button
                  onClick={() => handleVote(1)}
                  className={cn("rounded p-1 hover:text-orange-500 transition-colors", userVote === 1 && "text-orange-500")}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleVote(-1)}
                  className={cn("rounded p-1 hover:text-blue-500 transition-colors", userVote === -1 && "text-blue-500")}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground px-1.5" onClick={() => setReplying(!replying)}>
                  Reply
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground px-1.5"
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/u/${communityName}/comments/${postId}/${comment.id}`)}
                >
                  <Share2 className="h-3 w-3 mr-1" /> Share
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground px-1.5"
                  onClick={() => fetch(`/api/comments/${comment.id}/save`, { method: "POST" })}
                >
                  <Bookmark className="h-3 w-3 mr-1" /> Save
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

              {/* Children */}
              {comment.depth < MAX_DEPTH ? (
                comment.children.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {comment.children.map((child) => (
                      <CommentItem key={child.id} comment={child} postId={postId} communityName={communityName} onNewComment={onNewComment} />
                    ))}
                  </div>
                )
              ) : (
                comment.children.length > 0 && (
                  <Link
                    href={`/u/${communityName}/comments/${postId}/${comment.id}`}
                    className="mt-2 block text-xs text-primary hover:underline"
                  >
                    Continue this thread →
                  </Link>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
