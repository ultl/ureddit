# ureddit — Kanban

**Status key:** `[ ]` Backlog · `[~]` In Progress · `[x]` Done

Tasks are grouped by epic. Work top-to-bottom within each epic — later tasks depend on earlier ones.

---

## Epic 1 — Project Setup

- [x] Initialize Turborepo monorepo with Bun (`bunx create-turbo@latest`, select Bun)
- [x] Create workspace structure: `apps/web`, `packages/ui`, `packages/db`, `packages/typescript-config`, `packages/eslint-config`
- [x] Configure shared `tsconfig` in `packages/typescript-config`
- [x] Configure shared ESLint in `packages/eslint-config`
- [x] Set up `turbo.json` pipeline tasks: `build`, `dev`, `lint`, `typecheck`
- [x] Initialize shadcn/ui with monorepo config (`bunx shadcn@latest init -d` in `apps/web`)
- [x] Configure Tailwind v4 — system dark mode via `@media (prefers-color-scheme: dark)`
- [x] Create `.env.local.example` with all required variables
- [x] Create `docker-compose.yml` with services: PostgreSQL, Redis, MinIO, Meilisearch
- [x] Create `.gitignore`
- [ ] Verify all services start cleanly with `docker compose up`

---

## Epic 2 — Database Schema & Seed

- [x] Install Drizzle ORM and `drizzle-kit` in `packages/db`, configure `drizzle.config.ts`
- [x] Write schema — Better Auth tables: `users`, `sessions`, `accounts`, `verifications`
- [x] Write schema — community tables: `communities`, `communityMembers`, `communityRules`, `flairs`
- [x] Write schema — post tables: `posts`, `postVotes`
- [x] Write schema — comment tables: `comments`, `commentVotes`
- [x] Write schema — user action tables: `savedPosts`, `savedComments`, `hiddenPosts`, `recentCommunities`
- [x] Write schema — `notifications` table
- [x] Add indexes on all foreign key columns
- [x] Write Drizzle relations for relational query API
- [x] Generate and run initial migration (`drizzle-kit push`)
- [x] Install `@faker-js/faker` and write seed script (`packages/db/src/seed.ts`)
- [x] Seed: 5 communities, 20 users, 50 posts, 200 comments, 437 post votes, 732 comment votes

---

## Epic 3 — Authentication

- [x] Install Better Auth in `apps/web`
- [x] Create `apps/web/lib/auth.ts` — server-side auth instance with Google provider and `nextCookies()` plugin
- [x] Create `apps/web/lib/auth-client.ts` — client-side auth instance
- [x] Create `apps/web/app/api/auth/[...all]/route.ts` — catch-all route handler via `toNextJsHandler`
- [x] Configure `middleware.ts` to protect routes: `/submit`, `/notifications`, `/settings`
- [x] Build sign-in page (`/sign-in`) with "Continue with Google" button
- [ ] Register Google OAuth app in Google Cloud Console, set redirect URI to `http://localhost:3000/api/auth/callback/google`
- [ ] Test full OAuth flow: sign-in, session persistence, sign-out

---

## Epic 4 — Infrastructure Clients

- [x] Install AWS SDK + `@aws-sdk/s3-presigned-post`, configure MinIO S3 client (`packages/db/src/storage.ts`)
- [x] Implement `POST /api/upload` — generates MinIO presigned POST URL, returns `publicUrl`
- [x] Create MinIO bucket with public read policy via setup script
- [x] Install Meilisearch JS client, configure in `packages/db/src/search.ts`
- [x] Create Meilisearch indexes: `posts`, `communities`, `users` with searchable/sortable attributes
- [x] Install BullMQ + ioredis, configure queue (`packages/db/src/queue.ts`)
- [x] Write BullMQ worker (`packages/db/src/worker.ts`) — run with `bun run worker`
- [x] Write job handlers: sync post, community, user to Meilisearch
- [x] Redis client for pub/sub (`packages/db/src/redis.ts`)

---

## Epic 5 — Layout & Navigation

- [x] Root layout (`apps/web/app/layout.tsx`) — imports global styles, wraps with TanStack Query provider
- [x] Header component: logo, site name, search bar (placeholder), Create Post button, notification bell, user avatar dropdown, login button
- [x] User avatar dropdown: links to profile, settings, sign-out
- [x] Sidebar component: Home card (Create Post / Create Community CTAs), trending communities, popular communities, recently visited communities
- [x] Mobile responsive layout — sidebar hidden on small screens, hamburger or bottom nav
- [x] System dark/light theme wired via Tailwind `dark` variant (no toggle)
- [x] 404 and error pages

---

## Epic 6 — Feed

- [x] `GET /api/posts` route handler — cursor-based pagination, `sort` param (new/top), optional `communityId` filter, excludes hidden posts for auth users
- [x] Server-side prefetch of first feed page using TanStack Query `prefetchInfiniteQuery`
- [x] Post card — Card view: title, body preview, image/link thumbnail, author, community, timestamp, score, comment count, flair
- [x] Post card — Compact view: title, author, community, timestamp, score, comment count only
- [x] View mode toggle (Card / Compact), persisted to `localStorage`
- [x] Sort tab component (New / Top)
- [x] Infinite scroll: `useInfiniteQuery` + intersection observer to trigger next page fetch
- [x] Vote buttons on post card with optimistic UI update
- [x] Save / Unsave button on post card
- [x] Hide button on post card (removes post from feed, writes to `hiddenPosts`)
- [x] Share button on post card (copies post URL to clipboard)
- [x] Home page layout assembled: feed + sidebar

---

## Epic 7 — Communities

- [x] Community page layout (`/u/[name]`): banner, icon, display name, description, member/online count
- [x] Community sidebar: member count, online count (static first), rules list, moderators, flairs list
- [x] `POST /api/communities` — create community, enqueue Meilisearch sync job
- [x] Create community page/form (name, display name, description, icon upload, banner upload)
- [x] `POST /api/communities/[name]/join` — add `communityMembers` row, increment `memberCount`
- [x] `POST /api/communities/[name]/leave` — remove `communityMembers` row, decrement `memberCount`
- [x] Join / Leave button on community page (state aware)
- [x] Upsert `recentCommunities` row on community page load for auth users
- [x] Community feed (reuse feed components, pass `communityId` filter)

---

## Epic 8 — Post Creation

- [x] Submit page layout (`/submit`)
- [x] Community selector dropdown (fetches all communities, pre-fills from `?community=` query param)
- [x] Post type selector: Text / Image / Link tabs
- [x] Tiptap rich text editor component in `apps/web/components/editor/` (reusable across post body and comments)
- [x] Image upload flow: file picker → call `/api/upload` for presigned URL → POST to MinIO → show thumbnail preview
- [x] Link URL input with submission (no client-side preview — server fetches OG on submit)
- [x] Flair selector dropdown (loads flairs for selected community)
- [x] Form validation: title required, community required, post-type-specific field validation
- [x] `POST /api/posts` — save post to DB, fetch OG metadata for link posts via `open-graph-scraper`, enqueue Meilisearch sync job
- [x] Redirect to post detail page after successful creation

---

## Epic 9 — Post Detail & Voting

- [x] Post detail page layout (`/u/[name]/comments/[postId]`)
- [x] Full post rendering: title, Tiptap read-only body, image (full size), link preview card (title/description/image)
- [x] Vote buttons with optimistic UI (upvote / downvote)
- [x] `POST /api/posts/[id]/vote` — toggle/switch logic: same value deletes row, opposite updates row, new inserts row; updates `posts.score` and author `postKarma` in same transaction
- [x] Save / Unsave button + handler
- [x] Hide button + handler
- [x] Share button (copy URL to clipboard)
- [x] Flair tag display on post

---

## Epic 10 — Comments

- [x] `GET /api/posts/[id]/comments` — fetch threaded comments (recursive structure or flat with depth), support sort param
- [x] Comment list component — recursive render, indentation by depth
- [x] Comment collapse / expand toggle
- [x] Comment sort selector: Best, Top, New, Controversial, Old
- [x] Tiptap editor in comment form with `@mention` extension (autocomplete all platform users via `GET /api/users/search?q=`)
- [x] `POST /api/posts/[id]/comments` — save comment, compute depth from parent, detect @mentions and create notification rows, publish to Redis `post:[id]:comments`, publish notifications to `notifications:[userId]`
- [x] `POST /api/comments/[id]/vote` — same toggle/switch logic as post vote, updates `comments.score` and author `commentKarma`
- [x] Comment vote buttons with optimistic UI
- [x] Comment actions: Reply, Save/Unsave, Share
- [x] "Continue this thread →" link at depth 6, links to sub-thread page
- [x] Sub-thread view page (`/u/[name]/comments/[postId]/[commentId]`) — renders comment as root

---

## Epic 11 — Real-time (SSE)

- [ ] `GET /api/sse` — route handler: `ReadableStream`, `force-dynamic`, subscribes to Redis channels for the auth user
- [ ] On connect: subscribe to `notifications:[userId]`; if `?postId=` param provided, also subscribe to `post:[postId]:comments`
- [ ] On Redis message: encode as SSE event and enqueue to stream
- [ ] On disconnect (`req.signal` abort): unsubscribe from Redis channels, close stream
- [ ] Client hook `useSSE(postId?)` — opens `EventSource`, dispatches events, cleans up on unmount
- [ ] Wire comment real-time: new comment events received via SSE appended to comment list
- [ ] Wire notification real-time: notification events update bell badge count
- [ ] Community online count: on SSE connect, `SADD community:[id]:online [userId]` with 60s TTL; heartbeat every 30s refreshes TTL; display `SCARD` result in community sidebar

---

## Epic 12 — Notifications

- [ ] Notifications page layout (`/notifications`) — list of notifications sorted by `createdAt` desc
- [ ] Notification row component: type icon, actor name, linked post/comment preview, timestamp, read/unread indicator
- [ ] `POST /api/notifications/read` — sets all `notifications.read = true` for auth user
- [ ] Mark all as read on notifications page load
- [ ] Real-time bell badge: unread count from `notifications` table on page load, incremented via SSE events

---

## Epic 13 — Search

- [ ] `GET /api/search?q=` — proxy query to Meilisearch, return results from posts/communities/users indexes
- [ ] Search bar with debounce (300ms)
- [ ] Search results dropdown: shows top 3 results per category (posts, communities, users) with icons and metadata
- [ ] Keyboard navigation in search dropdown (arrow keys, Enter, Escape)
- [ ] Clear search on route change

---

## Epic 14 — User Profiles

- [ ] Profile page layout (`/user/[username]`) — avatar, banner, display name, bio, karma scores, join date
- [ ] Posts tab — paginated list of posts authored by this user (reuse post card)
- [ ] Comments tab — list of comments authored by this user with post context link
- [ ] Saved tab — visible only to profile owner; shows saved posts and comments
- [ ] `GET /api/users/[username]` — fetch profile data
- [ ] Enqueue Meilisearch sync job after profile update

---

## Epic 15 — Settings

- [ ] Settings page layout (`/settings`) — form sections for profile and account
- [ ] Display name field + bio field with save button
- [ ] Avatar upload (presigned URL → MinIO, same pattern as post images)
- [ ] Banner upload (presigned URL → MinIO)
- [ ] `PATCH /api/users/me` — update `users` record, enqueue Meilisearch sync
- [ ] Delete account section — confirmation dialog ("Type your username to confirm")
- [ ] `DELETE /api/users/me` — cascade delete all user-owned data, sign out session

---

## Epic 16 — Polish & QA

- [ ] Loading skeletons for feed, post detail, comments, profile
- [ ] Empty states: empty feed, no comments yet, no notifications, no search results
- [ ] Error boundaries for failed API requests
- [ ] Toast notifications for user actions (post created, comment submitted, settings saved, link copied)
- [ ] Confirm the full vote toggle/switch behavior works correctly across post and comment contexts
- [ ] Test infinite scroll edge cases: end of feed, network error mid-scroll
- [ ] Test SSE reconnect behavior on connection drop
- [ ] Verify system dark/light theme renders correctly for all pages
- [ ] Verify mobile responsive layout on small viewports
- [ ] Smoke test the full user flow: sign in → create community → create post → comment → vote → search → notifications → settings → sign out
