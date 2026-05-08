# ureddit — Project Plan

## Overview
A personal Reddit clone called **ureddit**. Personal project (portfolio-grade). Not a full Reddit parity build — focused on the core home feed experience.

---

## Tech Stack
- **Monorepo**: Turborepo + Bun
- **Frontend**: Next.js (`apps/web`)
- **UI**: shadcn/ui + Tailwind CSS (`packages/ui`)
- **Database**: PostgreSQL via Drizzle ORM (`packages/db`)
- **Auth**: Better Auth — Google OAuth only (Phase 1)
- **Real-time**: Server-Sent Events (Next.js native) + Redis pub/sub (Redis via Docker Compose)
- **Deployment**: Local only via Docker Compose (PostgreSQL, Redis, MinIO, Meilisearch)
- **File storage**: MinIO (S3-compatible, self-hosted via Docker Compose)
- **Search**: Meilisearch (self-hosted via Docker Compose, indexes posts/communities/users)
- **Job queue**: BullMQ (backed by Redis) — async Meilisearch sync after DB writes
- **Editor**: Tiptap (rich text, WYSIWYG) for post body and comments — content stored as `jsonb` in DB, includes `@mention` extension (platform-wide user autocomplete)
- **Data fetching**: TanStack Query (`useInfiniteQuery` for feed infinite scroll, `prefetchInfiniteQuery` server-side for SEO)

---

## Features — Home (`/`)

### Navigation / Header
- Logo + site name (ureddit)
- Global search bar (posts, communities, users)
- Create Post button
- Notification bell (real-time)
- User avatar + dropdown menu (profile, settings, logout)
- Login button (when logged out)

### Feed
- Feed sorting tabs: New, Top (Hot / Rising / Best deferred)
- Infinite scroll with cursor-based pagination (no page numbers)
- Two view modes: **Card** (full preview) and **Compact** (title + meta only)
- Post types supported: **Text**, **Image** (optional), **Link** (URL preview)
- Each post shows: title, caption/body preview, author, community, timestamp, vote score, comment count
- Post actions: Upvote / Downvote, Comment, Share (copy link), Save, Hide

### Sidebar
- "Home" card with description + Create Post / Create Community CTAs
- Trending communities list
- Popular communities list
- Recently visited communities

### Communities (equivalent of subreddits)
- Name, icon, banner, description
- Member count + online count
- Rules section
- Moderators list
- Post flair tags (colored, per-community)
- Community feed with same sorting/view options as home

### Route Structure

| Route | Page |
|---|---|
| `/` | Home feed |
| `/u/[name]` | Community page |
| `/u/[name]/comments/[postId]` | Post detail + comments |
| `/u/[name]/comments/[postId]/[commentId]` | Threaded sub-comment view |
| `/submit` | Create post |
| `/submit?community=[name]` | Create post pre-filled with community |
| `/user/[username]` | User profile |
| `/notifications` | Notifications page |
| `/settings` | User settings |
| `/api/auth/[...all]` | Better Auth handler |
| `/api/posts` | Feed API (cursor-based) |
| `/api/posts/[id]/comments` | Comments API |
| `/api/sse` | SSE stream |
| `/api/upload` | Presigned URL generator for MinIO |
| `/api/search` | Meilisearch proxy |

### Post Creation
- Dedicated page at `/submit`
- Community dropdown pre-populated when navigating from within a community
- Post type selector: Text / Image / Link

### Posts
- Title (required)
- Caption / body text (optional)
- Image (optional, single image — uploads immediately on pick via MinIO presigned URL, `imageUrl` stored in form state before submit)
- Link URL (optional, with preview card — OpenGraph fetched server-side on post creation via `open-graph-scraper`, stored in DB)
- Upvote / Downvote (score displayed)
- Comment count
- Share (copy link to post)
- Save / Unsave

### Comments
- Nested / threaded (Reddit-style collapse)
- Upvote / Downvote
- Reply, Share, Save
- Sort: Best, Top, New, Controversial, Old
- Real-time updates (new comments appear live)

### User Profiles
- Avatar, banner, bio
- Post karma + Comment karma
- Posts tab, Comments tab, Saved tab
- Join date

### Settings (`/settings`)
- Display name
- Avatar upload (MinIO)
- Banner upload (MinIO)
- Bio
- Delete account (full cascade delete)

### Notifications (real-time)
- Reply to your post
- Reply to your comment
- Mention (@username)

### Auth
- Google OAuth (Better Auth)
- Browsing is public (no login required to read)
- Posting, commenting, voting require login

---

## Seed Data
- 5 communities, 20 users, 50 posts (mix of text/image/link), 200 comments (nested)
- Fake data via `@faker-js/faker`
- Seed script at `packages/db/src/seed.ts`, run with `bun run seed`

---

## Phases
1. **Idea** (clarification + feature definition)
2. **Research** (tech decisions, library evaluation)
3. **Write PRD** (full product requirements doc)
4. **Kanban** (task breakdown)
5. **Implementation**

---

## Decisions (Idea phase — closed)
- Communities URL pattern: `/u/[name]`
- User profile URL pattern: `/user/[username]`
- Post flairs: yes — colored tags (e.g., "Discussion", "News", "Question")
- Theme: system-wide (follows OS dark/light preference, no manual toggle)
- Platform: web only, mobile responsive
- Moderation tools: skip for now
- Awards: skip
- Real-time transport: Server-Sent Events (Next.js native, no extra service)
- Seed data: 5 communities, 20 users, 50 posts, 200 comments

## Phase Status
- [x] **Idea** — complete
- [x] **Research** — complete
- [x] **Write PRD** — complete (see prd.md)
- [x] **Kanban** — complete (see kanban.md)
- [~] **Implementation** — in progress

---

## Research Findings

### 1. Monorepo — Turborepo + Bun

- Scaffold with `bunx create-turbo@latest`, select Bun as package manager
- Workspace structure: `apps/web` (Next.js), `packages/ui` (shadcn + Tailwind), `packages/db` (Drizzle), `packages/typescript-config`, `packages/eslint-config`
- Internal packages referenced as `"@workspace/ui": "workspace:*"` in each app's `package.json`
- `turbo.json` pipeline tasks: `build`, `dev`, `lint`, `typecheck` — cascade through workspaces automatically

### 2. Auth — Better Auth + Google OAuth

- Auth instance lives in `apps/web/lib/auth.ts` (server-side)
- Client instance lives in `apps/web/lib/auth-client.ts`
- Catch-all route handler at `apps/web/app/api/auth/[...all]/route.ts` via `toNextJsHandler`
- `nextCookies()` plugin required for Server Actions cookie handling
- Required env vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Google Cloud Console: add `http://localhost:3000/api/auth/callback/google` as authorized redirect URI
- Browsing is public; posting/voting/commenting check session server-side via middleware

### 3. Real-time — Server-Sent Events

- Route Handler with `ReadableStream` + `export const dynamic = 'force-dynamic'`
- Response headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`
- Client uses native `EventSource` API, cleanup on component unmount
- SSE is one-directional (server → client); user actions still use normal POST requests
- SSE use cases: live comments on post page, notification badge count, online member count
- Notifications pushed via Redis pub/sub channel `notifications:[userId]` — same SSE connection multiplexed for comments and notifications
- Online member count: Redis presence set per community (`SADD community:[id]:online [userId]` with 60s TTL, refreshed on SSE heartbeat, counted with `SCARD`)
- Real-time transport: Redis pub/sub (local Docker) — publishes to `post:[id]:comments` on new comment, `notifications:[userId]` on new notification

### 4. Database — Drizzle ORM + PostgreSQL Schema

Tables and key columns:

| Table | Key columns |
|---|---|
| `users` | id, name, email, image, banner, bio, postKarma, commentKarma, createdAt — karma updated per vote in same DB transaction |
| `sessions` | Better Auth managed |
| `accounts` | Better Auth managed |
| `communities` | id, name (slug), displayName, description, icon, banner, creatorId, memberCount, createdAt |
| `communityMembers` | communityId, userId — composite PK |
| `flairs` | id, communityId, name, color (hex) |
| `posts` | id, title, content (jsonb), type (text/image/link), imageUrl, linkUrl, linkPreviewTitle, linkPreviewDescription, linkPreviewImage, authorId, communityId, flairId, score, commentCount, createdAt |
| `postVotes` | postId, userId, value (+1/-1) — composite PK |
| `comments` | id, content (jsonb), postId, authorId, parentId (self-ref), depth, score, createdAt |
| `commentVotes` | commentId, userId, value (+1/-1) — composite PK |
| `savedPosts` | postId, userId — composite PK |
| `savedComments` | commentId, userId — composite PK |
| `hiddenPosts` | postId, userId — composite PK |
| `recentCommunities` | userId, communityId, visitedAt — composite PK (userId, communityId), keep last 5 per user |
| `communityRules` | id, communityId, title, description, order |
| `notifications` | id, userId, type (post_reply/comment_reply/mention), actorId, postId, commentId, read, createdAt |

Key patterns:
- `score` and `commentCount` are denormalized on posts/comments for fast feed queries
- `parentId` self-reference on `comments` enables nesting; `depth` column caps render at level 6 — beyond that shows "Continue this thread →" link to `/u/[community]/comments/[postId]/[commentId]`
- Index all foreign key columns

### 5. UI — shadcn/ui in Turborepo Monorepo

- Init with `bunx shadcn@latest init --monorepo`
- `packages/ui` owns Tailwind v4, `globals.css`, and all base component primitives
- `apps/web` imports global styles from `packages/ui` in `app/layout.tsx`
- Both `apps/web` and `packages/ui` need their own `components.json` with matching style/iconLibrary/baseColor
- Base components install to `packages/ui`; app-specific blocks install to `apps/web/components`
- Import pattern: `import { Button } from "@workspace/ui/components/button"`
