# ureddit

A personal Reddit clone — portfolio project. Communities, threaded comments, votes, real-time notifications, search, profiles, settings — all wired up with a modern self-hosted stack.

Not a 1:1 parity build of Reddit. Focused on the core home-feed experience and the systems behind it.

---

## Tech stack

| Layer | Choice |
|---|---|
| Monorepo | Turborepo + Bun (workspaces: `apps/*`, `packages/*`) |
| Frontend | Next.js 16 (App Router) + React 19 |
| UI | shadcn/ui + Tailwind v4 (system dark/light via `prefers-color-scheme`) |
| Editor | Tiptap 3 (text, image, link posts + comment editor with `@mention`) |
| Auth | Better Auth — email/password + optional Google OAuth |
| Database | PostgreSQL 16 via Drizzle ORM |
| Real-time | Server-Sent Events (Next.js route handler) + Redis pub/sub |
| Object storage | MinIO (S3-compatible) for avatars, banners, post images |
| Search | Meilisearch (posts, communities, users) |
| Job queue | BullMQ on Redis (async Meili sync after DB writes) |
| Data fetching | TanStack Query (infinite scroll + prefetch on the server) |

---

## Repo layout

```
apps/
  web/                # Next.js 16 app — UI, route handlers, SSE
packages/
  db/                 # Drizzle schema, Postgres client, BullMQ queue & worker,
                      # Meilisearch + MinIO clients, seed script
  ui/                 # Shared component package
  typescript-config/  # Shared tsconfig
  eslint-config/      # Shared ESLint
scripts/
  smoke-test.ts       # 22-check end-to-end smoke against a running dev server
docker-compose.yml    # Postgres, Redis, MinIO, Meilisearch
kanban.md             # Implementation plan / progress log
plan.md               # Long-form design document
prd.md                # Product requirements
```

---

## Running locally

### 1. Prereqs

- [Bun](https://bun.sh) 1.3+
- Docker (for the four backing services)

### 2. Start the backing services

```bash
docker compose up -d
```

Brings up:

| Service | Port | Purpose |
|---|---|---|
| Postgres | 5432 | Primary database |
| Redis | 6379 | Pub/sub, BullMQ queue, presence sets |
| MinIO | 9000 / 9001 | Image storage (web console at :9001, login `ureddit` / `ureddit123`) |
| Meilisearch | 7700 | Search index |

### 3. Install + env

```bash
bun install
cp .env.local.example .env.local
```

`.env.local` defaults already match `docker-compose.yml` — no edits needed unless you want to enable Google OAuth.

### 4. Initialize storage + indexes (first run only)

```bash
cd packages/db
bun run setup          # creates MinIO bucket + Meilisearch indexes
bun --env-file=../../.env.local run db:push   # pushes Drizzle schema → Postgres
bun --env-file=../../.env.local run seed      # 20 users, 5 communities, 50 posts, 200 comments
```

### 5. Run the app

```bash
# From repo root, in three terminals:
bun dev                                                      # Next.js dev server :3000
cd packages/db && bun --env-file=../../.env.local run worker # BullMQ worker for Meili sync
```

Then open <http://localhost:3000>.

To verify everything is wired correctly, run the smoke test (server + worker must be up):

```bash
bun run scripts/smoke-test.ts
```

22 checks — sign-up, community/post/comment CRUD, votes, save, profile, notifications, online presence, search, SSE handshake + live comment delivery, presence cleanup.

---

## Where the data lives

The app spreads state across four services. Quick reference for poking around:

| Service | Inspect with |
|---|---|
| **Postgres** | `bun --cwd packages/db drizzle-kit studio` (web GUI at <https://local.drizzle.studio>) |
| **Redis** | `redis-cli`, then `KEYS *`, `SMEMBERS community:<id>:online`, `SUBSCRIBE notifications:<userId>` |
| **MinIO** | <http://localhost:9001> — bucket `ureddit-assets`, files under `uploads/<uuid>.<ext>` |
| **Meilisearch** | `curl -H "Authorization: Bearer ureddit-master-key" http://localhost:7700/indexes` |

**Source-of-truth rule:** Postgres holds canonical data. Meilisearch is denormalized and rebuilt from Postgres by the worker. Redis state is ephemeral (presence/queue/pub-sub) and can be wiped without data loss.

---

## Features

- **Auth** — email/password sign-up, sessions, optional Google OAuth
- **Communities** — create, join/leave, member + online count, rules, flairs, recently visited
- **Feed** — Card/Compact views, New/Top sort, infinite scroll, hide/save, optimistic vote
- **Post types** — Text (Tiptap), Image (upload to MinIO), Link (server-fetched OG preview)
- **Post detail** — full body, threaded comments (depth-6 then "Continue this thread"), vote, save, hide, share
- **Comments** — Tiptap editor with `@mention` autocomplete; sort by Best/Top/New/Old/Controversial
- **Real-time** — single multiplexed SSE connection per page, drives live comments, notification bell, online count
- **Notifications** — replies, mentions; bell badge updates live; mark-all-read on the notifications page
- **Search** — debounced multi-index (posts, communities, users) with keyboard navigation
- **Profiles** — avatar, banner, bio, karma, join date; Posts/Comments/Saved tabs
- **Settings** — edit display name, bio, avatar, banner; delete account (type-username-to-confirm)

---

## How real-time works

```
client                    /api/sse                  Redis                   worker
─────                    ──────────                 ───────                 ────────
EventSource ─────────►  ReadableStream
                        SUBSCRIBE notifications:<uid>
                        SUBSCRIBE post:<id>:comments  (if ?postId=)
                        SADD community:<id>:online    (if ?communityId=)

POST /api/.../comments  ──►  insert into Postgres
                              PUBLISH post:<id>:comments  ──►  ────► fans out to SSE
                              PUBLISH notifications:<uid> ──►  ────►   (re-encoded as
                                                                        SSE events)

setInterval(30s)        EXPIRE community:<id>:online 60s  (heartbeat)

on disconnect           req.signal.abort  ──►  unsubscribe, SREM presence
```

A React context (`providers/sse-provider.tsx`) holds one `EventSource` per page; components subscribe to specific event types via `useSSEListener`.

---

## Common gotchas

- **Containers freshly started** — re-run `bun --cwd packages/db --env-file=../../.env.local run db:push` and `… run seed`. Without it, every API call fails with `relation "<table>" does not exist`.
- **Meilisearch empty** — make sure the BullMQ **worker** is running. The API enqueues sync jobs; the worker drains them.
- **Tiptap SSR error on `/submit`** — `useEditor({ immediatelyRender: false, … })` is required (already configured throughout the codebase).
- **Comment button stuck disabled** — Tiptap v3 doesn't re-render on edits by default; the form tracks `isEmpty` via `onUpdate`.

---

## Useful scripts

```bash
# Type check the whole monorepo
bun run check-types

# Format with Prettier
bun run format

# Drizzle Studio (DB GUI)
bun --cwd packages/db drizzle-kit studio

# Reset the DB
bun --cwd packages/db --env-file=../../.env.local run db:push
bun --cwd packages/db --env-file=../../.env.local run seed

# End-to-end smoke
bun run scripts/smoke-test.ts
```

---

## Status

All 16 epics in [`kanban.md`](./kanban.md) are complete. The remaining unchecked items are intentional opt-ins:
- Google OAuth credentials (works without — email/password is the primary path)
- One-command `docker compose up` sanity check on a clean machine
