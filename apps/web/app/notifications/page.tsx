"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationRow, type NotificationItem } from "@/components/notifications/notification-row";

export default function NotificationsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [items, setItems] = useState<NotificationItem[] | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.replace("/sign-in?callbackUrl=/notifications");
      return;
    }

    (async () => {
      const res = await fetch("/api/notifications");
      const data = (await res.json()) as NotificationItem[];
      setItems(data);
      // Mark all as read once loaded
      fetch("/api/notifications/read", { method: "POST" }).catch(() => {});
    })();
  }, [isPending, session, router]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {items === null ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-7 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((n) => (
                <NotificationRow key={n.id} notification={n} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
