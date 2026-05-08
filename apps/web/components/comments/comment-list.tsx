"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommentItem } from "./comment-item";
import { CommentForm } from "./comment-form";

export type CommentNode = {
  id: string;
  content: string;
  postId: string;
  parentId: string | null;
  depth: number;
  score: number;
  createdAt: string | Date;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  userVote: number;
  children: CommentNode[];
};

type FlatComment = Omit<CommentNode, "children">;

function buildTree(flat: FlatComment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  flat.forEach((c) => map.set(c.id, { ...c, children: [] }));
  flat.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

const SORTS = ["best", "top", "new", "old", "controversial"] as const;
type Sort = (typeof SORTS)[number];

type Props = { postId: string; communityName: string };

export function CommentList({ postId, communityName }: Props) {
  const [sort, setSort] = useState<Sort>("best");
  const [tree, setTree] = useState<CommentNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/posts/${postId}/comments?sort=${sort}`)
      .then((r) => r.json())
      .then((flat: FlatComment[]) => { setTree(buildTree(flat)); setLoading(false); });
  }, [postId, sort]);

  function addComment(newComment: CommentNode) {
    if (!newComment.parentId) {
      setTree((prev) => [newComment, ...prev]);
      return;
    }
    function insertInto(nodes: CommentNode[]): CommentNode[] {
      return nodes.map((n) => {
        if (n.id === newComment.parentId) return { ...n, children: [...n.children, newComment] };
        return { ...n, children: insertInto(n.children) };
      });
    }
    setTree((prev) => insertInto(prev));
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      {/* Sort tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-sm font-medium mr-2">Sort by:</span>
        {SORTS.map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors",
              sort === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Top-level comment form */}
      <CommentForm postId={postId} onSubmit={addComment} />

      {/* Comment tree */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : tree.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">No comments yet. Be the first!</p>
      ) : (
        <div className="space-y-3">
          {tree.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              communityName={communityName}
              onNewComment={addComment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
