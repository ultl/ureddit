"use client";

import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Bell, Plus, Search } from "lucide-react";

export function Header() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-3 px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-primary shrink-0">
          <span className="text-orange-500 text-xl">●</span>
          <span className="text-base">ureddit</span>
        </Link>

        {/* Search */}
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-sm text-muted-foreground max-w-md">
          <Search className="h-4 w-4 shrink-0" />
          <span>Search ureddit</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link href="/submit">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Create</span>
                </Button>
              </Link>
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                {user.image && (
                  <img
                    src={user.image}
                    alt={user.name ?? ""}
                    className="h-7 w-7 rounded-full object-cover cursor-pointer"
                    onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/"; } } })}
                  />
                )}
              </div>
            </>
          ) : (
            <Link href="/sign-in">
              <Button size="sm">Log In</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
