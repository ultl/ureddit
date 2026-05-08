import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowUp, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TiptapViewer } from "@/components/editor/tiptap-viewer";

export type ProfileComment = {
  id: string;
  content: string;
  score: number;
  createdAt: string | Date;
  postId: string;
  postTitle: string;
  communityName: string;
  authorName?: string;
};

function isValidJson(s: string) {
  try { JSON.parse(s); return true; } catch { return false; }
}

export function ProfileCommentRow({ comment }: { comment: ProfileComment }) {
  const href = `/u/${comment.communityName}/comments/${comment.postId}#comment-${comment.id}`;
  return (
    <Card size="sm" className="px-3 py-2.5 hover:ring-primary/40 transition-all">
      <p className="text-xs text-muted-foreground">
        {comment.authorName && (
          <>
            <Link href={`/user/${comment.authorName}`} className="font-medium text-foreground hover:underline">
              {comment.authorName}
            </Link>{" "}
          </>
        )}
        commented in{" "}
        <Link href={`/u/${comment.communityName}`} className="font-medium text-foreground hover:underline">
          u/{comment.communityName}
        </Link>{" "}
        ·{" "}
        <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
      </p>
      <Link href={href} className="text-sm font-medium hover:underline line-clamp-1 block mt-0.5">
        {comment.postTitle}
      </Link>
      <div className="text-sm mt-1.5 line-clamp-3">
        {isValidJson(comment.content) ? (
          <TiptapViewer content={comment.content} />
        ) : (
          <p>{comment.content}</p>
        )}
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <ArrowUp className="size-3" />
          {comment.score}
        </span>
        <Link href={href} className="flex items-center gap-1 hover:text-foreground">
          <MessageSquare className="size-3" />
          View
        </Link>
      </div>
    </Card>
  );
}
