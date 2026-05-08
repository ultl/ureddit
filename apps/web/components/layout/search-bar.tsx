"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, FileText, Users, User as UserIcon, ArrowUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type PostHit = {
  id: string;
  title: string;
  score: number;
  commentCount: number;
  communityName: string;
};
type CommunityHit = {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  icon: string | null;
  memberCount: number;
};
type UserHit = {
  id: string;
  name: string;
  image: string | null;
  postKarma: number;
};
type SearchResults = {
  posts: PostHit[];
  communities: CommunityHit[];
  users: UserHit[];
};

type FlatItem =
  | { kind: "post"; data: PostHit }
  | { kind: "community"; data: CommunityHit }
  | { kind: "user"; data: UserHit };

const EMPTY: SearchResults = { posts: [], communities: [], users: [] };
const DEBOUNCE_MS = 300;

function getHref(item: FlatItem): string {
  if (item.kind === "post") {
    return `/u/${item.data.communityName}/comments/${item.data.id}`;
  }
  if (item.kind === "community") return `/u/${item.data.name}`;
  return `/user/${item.data.name}`;
}

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced fetch
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(EMPTY);
      return;
    }
    const handle = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data = (await res.json()) as SearchResults;
      setResults(data);
      setActiveIdx(0);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  // Clear on route change
  useEffect(() => {
    setQuery("");
    setResults(EMPTY);
    setOpen(false);
  }, [pathname]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const flat = useMemo<FlatItem[]>(() => {
    return [
      ...results.posts.map((data) => ({ kind: "post" as const, data })),
      ...results.communities.map((data) => ({ kind: "community" as const, data })),
      ...results.users.map((data) => ({ kind: "user" as const, data })),
    ];
  }, [results]);

  const showDropdown = open && query.trim().length > 0;
  const hasAnyResult = flat.length > 0;

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!showDropdown || !hasAnyResult) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[activeIdx];
      if (item) router.push(getHref(item));
    }
  }

  let runningIdx = -1;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground z-10" />
      <Input
        ref={inputRef}
        type="search"
        placeholder="Search ureddit"
        className="pl-8 rounded-full bg-muted"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-1 max-h-[70vh] overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10">
          {!hasAnyResult ? (
            <p className="p-3 text-sm text-muted-foreground">No results.</p>
          ) : (
            <div className="py-1">
              {results.posts.length > 0 && (
                <Section label="Posts" icon={FileText}>
                  {results.posts.map((p) => {
                    runningIdx++;
                    return (
                      <ResultLink
                        key={p.id}
                        href={`/u/${p.communityName}/comments/${p.id}`}
                        active={runningIdx === activeIdx}
                        onMouseEnter={() => setActiveIdx(runningIdx)}
                      >
                        <div className="flex w-6 shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
                          <ArrowUp className="size-3" />
                          {p.score}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{p.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            u/{p.communityName} · {p.commentCount} comments
                          </p>
                        </div>
                      </ResultLink>
                    );
                  })}
                </Section>
              )}

              {results.communities.length > 0 && (
                <Section label="Communities" icon={Users}>
                  {results.communities.map((c) => {
                    runningIdx++;
                    return (
                      <ResultLink
                        key={c.id}
                        href={`/u/${c.name}`}
                        active={runningIdx === activeIdx}
                        onMouseEnter={() => setActiveIdx(runningIdx)}
                      >
                        <Avatar size="sm">
                          {c.icon && <AvatarImage src={c.icon} alt={c.name} />}
                          <AvatarFallback>{c.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">u/{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {c.memberCount.toLocaleString()} members
                          </p>
                        </div>
                      </ResultLink>
                    );
                  })}
                </Section>
              )}

              {results.users.length > 0 && (
                <Section label="Users" icon={UserIcon}>
                  {results.users.map((u) => {
                    runningIdx++;
                    return (
                      <ResultLink
                        key={u.id}
                        href={`/user/${u.name}`}
                        active={runningIdx === activeIdx}
                        onMouseEnter={() => setActiveIdx(runningIdx)}
                      >
                        <Avatar size="sm">
                          {u.image && <AvatarImage src={u.image} alt={u.name} />}
                          <AvatarFallback>{u.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{u.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {u.postKarma.toLocaleString()} karma
                          </p>
                        </div>
                      </ResultLink>
                    );
                  })}
                </Section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof FileText;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ResultLink({
  href,
  active,
  onMouseEnter,
  children,
}: {
  href: string;
  active: boolean;
  onMouseEnter: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onMouseEnter={onMouseEnter}
      className={`flex items-center gap-2 px-3 py-1.5 text-sm ${active ? "bg-accent" : ""}`}
    >
      {children}
    </Link>
  );
}
