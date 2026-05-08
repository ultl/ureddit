"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PostCard, type PostItem } from "@/components/feed/post-card";
import { ProfileCommentRow, type ProfileComment } from "./profile-comment-row";

type TabKey = "posts" | "comments" | "saved";

type SavedResponse = {
  posts: PostItem[];
  comments: ProfileComment[];
};

type Props = { username: string; isOwner: boolean };

export function ProfileTabs({ username, isOwner }: Props) {
  const [tab, setTab] = useState<TabKey>("posts");

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
      <TabsList>
        <TabsTrigger value="posts">Posts</TabsTrigger>
        <TabsTrigger value="comments">Comments</TabsTrigger>
        {isOwner && <TabsTrigger value="saved">Saved</TabsTrigger>}
      </TabsList>

      <TabsContent value="posts" className="pt-4">
        <PostsList username={username} active={tab === "posts"} />
      </TabsContent>
      <TabsContent value="comments" className="pt-4">
        <CommentsList username={username} active={tab === "comments"} />
      </TabsContent>
      {isOwner && (
        <TabsContent value="saved" className="pt-4">
          <SavedList active={tab === "saved"} />
        </TabsContent>
      )}
    </Tabs>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}

function PostsList({ username, active }: { username: string; active: boolean }) {
  const [posts, setPosts] = useState<PostItem[] | null>(null);

  useEffect(() => {
    if (!active || posts !== null) return;
    fetch(`/api/users/${username}/posts`)
      .then((r) => r.json())
      .then(setPosts);
  }, [active, username, posts]);

  if (posts === null) return <ListSkeleton />;
  if (posts.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-8">No posts yet.</p>;
  }
  return (
    <div className="space-y-3">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} compact queryKey={["userPosts", username]} />
      ))}
    </div>
  );
}

function CommentsList({ username, active }: { username: string; active: boolean }) {
  const [comments, setComments] = useState<ProfileComment[] | null>(null);

  useEffect(() => {
    if (!active || comments !== null) return;
    fetch(`/api/users/${username}/comments`)
      .then((r) => r.json())
      .then(setComments);
  }, [active, username, comments]);

  if (comments === null) return <ListSkeleton />;
  if (comments.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-8">No comments yet.</p>;
  }
  return (
    <div className="space-y-3">
      {comments.map((c) => (
        <ProfileCommentRow key={c.id} comment={c} />
      ))}
    </div>
  );
}

function SavedList({ active }: { active: boolean }) {
  const [data, setData] = useState<SavedResponse | null>(null);

  useEffect(() => {
    if (!active || data !== null) return;
    fetch("/api/users/me/saved")
      .then((r) => r.json())
      .then(setData);
  }, [active, data]);

  if (data === null) return <ListSkeleton />;
  if (data.posts.length === 0 && data.comments.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-8">Nothing saved yet.</p>;
  }
  return (
    <div className="space-y-6">
      {data.posts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Saved posts</h3>
          {data.posts.map((p) => (
            <PostCard key={p.id} post={p} compact queryKey={["saved"]} />
          ))}
        </div>
      )}
      {data.comments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Saved comments</h3>
          {data.comments.map((c) => (
            <ProfileCommentRow key={c.id} comment={c} />
          ))}
        </div>
      )}
    </div>
  );
}
