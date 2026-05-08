import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Reply, AtSign } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  type: "post_reply" | "comment_reply" | "mention";
  read: boolean;
  createdAt: string | Date;
  actorId: string;
  actorName: string;
  actorImage: string | null;
  postId: string | null;
  postTitle: string | null;
  commentId: string | null;
  commentContent: string | null;
  communityName: string | null;
};

const TYPE_META: Record<NotificationItem["type"], { icon: typeof MessageSquare; verb: string }> = {
  post_reply: { icon: MessageSquare, verb: "replied to your post" },
  comment_reply: { icon: Reply, verb: "replied to your comment" },
  mention: { icon: AtSign, verb: "mentioned you" },
};

function extractPlainText(content: string | null): string {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content) as { content?: unknown[] };
    const out: string[] = [];
    function walk(nodes: unknown[]) {
      for (const node of nodes) {
        const n = node as { type?: string; text?: string; content?: unknown[]; attrs?: { label?: string } };
        if (n.type === "text" && n.text) out.push(n.text);
        if (n.type === "mention" && n.attrs?.label) out.push(`@${n.attrs.label}`);
        if (n.content) walk(n.content);
      }
    }
    if (parsed.content) walk(parsed.content);
    return out.join(" ");
  } catch {
    return content;
  }
}

export function NotificationRow({ notification }: { notification: NotificationItem }) {
  const { icon: Icon, verb } = TYPE_META[notification.type];
  const href =
    notification.communityName && notification.postId
      ? notification.commentId
        ? `/u/${notification.communityName}/comments/${notification.postId}#comment-${notification.commentId}`
        : `/u/${notification.communityName}/comments/${notification.postId}`
      : "#";

  const preview = notification.commentContent
    ? extractPlainText(notification.commentContent)
    : notification.postTitle ?? "";

  return (
    <Link
      href={href}
      className={cn(
        "flex gap-3 rounded-md border border-border p-3 transition-colors hover:bg-muted/50",
        !notification.read && "bg-primary/5 border-primary/20"
      )}
    >
      <div className="relative shrink-0">
        <Avatar size="sm">
          {notification.actorImage && (
            <AvatarImage src={notification.actorImage} alt={notification.actorName} />
          )}
          <AvatarFallback>{notification.actorName.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border">
          <Icon className="size-2.5" />
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm">
          <span className="font-medium">{notification.actorName}</span>{" "}
          <span className="text-muted-foreground">{verb}</span>
          {notification.postTitle && (
            <>
              {" "}
              <span className="text-muted-foreground">in</span>{" "}
              <span className="font-medium">{notification.postTitle}</span>
            </>
          )}
        </p>
        {preview && notification.commentContent && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{preview}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>

      {!notification.read && (
        <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
      )}
    </Link>
  );
}
