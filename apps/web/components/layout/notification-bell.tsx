"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSSEListener } from "@/providers/sse-provider";

export function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch("/api/notifications/unread-count")
      .then((r) => r.json())
      .then((data: { count: number }) => setCount(data.count));
  }, []);

  useSSEListener("notification", () => {
    setCount((c) => c + 1);
  });

  return (
    <Link href="/notifications" onClick={() => setCount(0)}>
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Button>
    </Link>
  );
}
