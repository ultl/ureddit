"use client";

import { useEffect, useState } from "react";
import { CommentItem } from "./comment-item";
import { CommentForm } from "./comment-form";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

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
      .then((flat: FlatComment[]) => {
        setTree(buildTree(flat));
        setLoading(false);
      });
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
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">Sort by:</span>
          <Tabs value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <TabsList>
              {SORTS.map((s) => (
                <TabsTrigger key={s} value={s} className="capitalize">
                  {s}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <CommentForm postId={postId} onSubmit={addComment} />

        {loading ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <Skeleton className="size-7 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : tree.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">
            No comments yet. Be the first!
          </p>
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
      </CardContent>
    </Card>
  );
}
