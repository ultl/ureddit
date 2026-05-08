# ureddit — Product Requirements Document

**Version:** 1.0
**Date:** 2026-05-08
**Status:** Draft
**Author:** ureddit team

---

## 1. Overview

ureddit is a personal portfolio Reddit clone. It replicates the core Reddit home feed experience — communities, posts, threaded comments, voting, real-time updates, and notifications — under the ureddit brand. It is a local-only web application, not publicly deployed.

---

## 2. Goals

- Deliver a fully functional Reddit-like experience: communities, posts (text/image/link), threaded comments, voting, real-time updates, and notifications.
- Demonstrate production-grade architectural decisions: Turborepo monorepo, Drizzle ORM schema, Better Auth, SSE + Redis pub/sub, BullMQ job queue, and Meilisearch.
- Be portfolio-ready: visually polished, mobile responsive, system dark/light theme support.

---

## 3. Non-Goals

- Public deployment or production hosting.
- Moderation tools (remove post, ban user).
- Awards or coins system.
- Native mobile app.
- Email/password authentication.
- Multiple simultaneous auth providers (Google only, Phase 1).
- Hot, Rising, or Best feed sorting (deferred).
- Video posts.
- Direct messaging.
- Community rules editing UI (rules seeded, no editor in Phase 1).

---

## 4. User Personas

| Persona | Description | Capabilities |
|---|---|---|
| **Guest** | Unauthenticated visitor | Browse feed, view posts, view comments, view profiles, search |
| **Member** | Signed-in user via Google OAuth | All guest actions + post, comment, vote, save, hide, create community, follow community, get notifications |
| **Community Creator** | Member who created a community | All member actions + community listed under their profile |

---

## 5. Functional Requirements

### FR-AUTH — Authentication

- FR-AUTH-1: Users sign in exclusively via Google OAuth through Better Auth.
- FR-AUTH-2: Browsing (feed, posts, communities, profiles) is fully public — no login required.
- FR-AUTH-3: The following actions require authentication: creating a post, creating a comment, voting, saving, hiding, creating a community, updating settings.
- FR-AUTH-4: Unauthenticated users attempting a protected action are redirected to the sign-in flow.
- FR-AUTH-5: On first sign-in, a user record is created in the `users` table with data from Google (name, email, avatar).
- FR-AUTH-6: Session is managed via Better Auth cookies with the `nextCookies()` plugin active.

---

### FR-FEED — Home Feed

- FR-FEED-1: The home page (`/`) displays a paginated feed of posts from all communities.
- FR-FEED-2: The feed supports two sort modes: **New** (chronological descending) and **Top** (score descending).
- FR-FEED-3: The feed loads the first page server-side for SEO. Subsequent pages load client-side via TanStack Query `useInfiniteQuery`.
- FR-FEED-4: Pagination is cursor-based (no page numbers). Each response includes a `nextCursor` value used to fetch the next page.
- FR-FEED-5: The feed supports two view modes switchable by the user: **Card** (full post preview) and **Compact** (title + metadata only).
- FR-FEED-6: Each post card displays: title, body preview (Card mode), post type indicator, author username, community name, time since posted, vote score, comment count, and flair tag if set.
- FR-FEED-7: Hidden posts (`hiddenPosts` table) are excluded from the feed for authenticated users.
- FR-FEED-8: The feed sidebar shows: a Home card with Create Post / Create Community CTAs, a trending communities list, a popular communities list, and recently visited communities (last 5 from `recentCommunities`).

---

### FR-POST — Posts

- FR-POST-1: Three post types are supported: **Text**, **Image**, **Link**. The user selects the type on the create post page.
- FR-POST-2: All posts require a title. Body content is optional for Text and Link posts.
- FR-POST-3: Text posts use the Tiptap rich text editor. Body content is stored as `jsonb`.
- FR-POST-4: Image posts allow a single image upload. The image uploads immediately on file pick via a MinIO presigned URL. The returned URL is stored in form state and submitted with the post.
- FR-POST-5: Link posts accept a URL. On post creation, the server fetches OpenGraph metadata (`linkPreviewTitle`, `linkPreviewDescription`, `linkPreviewImage`) via `open-graph-scraper` and stores it in the DB.
- FR-POST-6: Posts can have an optional flair tag, selected from the community's flair list.
- FR-POST-7: Post `score` and `commentCount` are denormalized columns updated on every vote or comment action.
- FR-POST-8: Post actions available to authenticated users: Upvote, Downvote, Save/Unsave, Hide, Share (copies URL to clipboard).
- FR-POST-9: Vote behavior: clicking the active vote direction removes the vote (toggle off). Clicking the opposite direction switches the vote. Vote change updates the `score` column and the author's `postKarma` in the same DB transaction.
- FR-POST-10: The create post page lives at `/submit`. If navigated from a community page, the community dropdown is pre-populated with that community.
- FR-POST-11: Any authenticated user can create a post in any community.

---

### FR-COMMENT — Comments

- FR-COMMENT-1: Comments are nested and threaded (Reddit-style). Each comment may have a `parentId` referencing another comment in the same post.
- FR-COMMENT-2: Comment `depth` is stored as an integer. Comments beyond depth 6 are not rendered inline — a "Continue this thread →" link is shown instead, navigating to `/u/[community]/comments/[postId]/[commentId]` where the deep comment becomes the root.
- FR-COMMENT-3: Comment body uses the Tiptap rich text editor with the `@mention` extension, allowing autocomplete of all platform users.
- FR-COMMENT-4: Comment content is stored as `jsonb`.
- FR-COMMENT-5: Comment actions: Upvote, Downvote, Reply, Save/Unsave, Share (copies URL to clipboard), Collapse thread.
- FR-COMMENT-6: Comment vote behavior follows the same toggle/switch logic as post votes. Vote changes update `comments.score` and the author's `commentKarma` in the same DB transaction.
- FR-COMMENT-7: Comment sort options on the post detail page: Best, Top, New, Controversial, Old.
- FR-COMMENT-8: New comments appear in real-time for all users viewing the same post. The SSE stream for a post publishes new comments via the Redis channel `post:[id]:comments`.

---

### FR-COMMUNITY — Communities

- FR-COMM-1: Communities are accessible at `/u/[name]` where `name` is the unique URL slug.
- FR-COMM-2: Any authenticated user can create a community. The creator's `userId` is stored in `communities.creatorId`.
- FR-COMM-3: Community pages display: icon, banner, display name, description, member count, online member count, rules, moderators (creator), and a community feed with New/Top sorting.
- FR-COMM-4: Online member count is maintained via a Redis presence set (`community:[id]:online`) with a 60-second TTL per user, refreshed on SSE heartbeat. The count is retrieved with `SCARD`.
- FR-COMM-5: Authenticated users can join or leave a community. Membership is tracked in `communityMembers`. `communities.memberCount` is updated on join/leave.
- FR-COMM-6: Community rules are stored in `communityRules` (title, description, display order) and shown in the sidebar. Rules are seeded; no editing UI in Phase 1.
- FR-COMM-7: Post flair tags are per-community, stored in the `flairs` table with a name and hex color. Posts in that community can optionally be tagged with one flair.
- FR-COMM-8: Visiting a community page upserts a row in `recentCommunities` for authenticated users, keeping only the 5 most recent.

---

### FR-USER — User Profiles

- FR-USER-1: User profiles are accessible at `/user/[username]`.
- FR-USER-2: Profiles display: avatar, banner, display name, bio, post karma, comment karma, join date.
- FR-USER-3: Profile has three tabs: **Posts** (posts authored by this user), **Comments** (comments authored), **Saved** (saved posts and comments, visible only to the profile owner).
- FR-USER-4: Post karma = sum of all `postVotes.value` on posts authored by the user (maintained as `users.postKarma`, updated per vote). Comment karma = same for comments.

---

### FR-SETTINGS — Settings

- FR-SET-1: Settings page is at `/settings`, accessible only to authenticated users.
- FR-SET-2: Users can update: display name, bio, avatar image (uploaded to MinIO), banner image (uploaded to MinIO).
- FR-SET-3: Image uploads on the settings page use the same MinIO presigned URL pattern as post image uploads — upload on pick, store URL on save.
- FR-SET-4: Users can delete their account. Deletion cascades to all owned data: posts, comments, votes, notifications, community memberships, saved items, hidden posts, recent communities.

---

### FR-NOTIF — Notifications

- FR-NOTIF-1: Notifications are generated for three events: a reply to your post, a reply to your comment, and a `@mention` in any comment.
- FR-NOTIF-2: Notifications are stored in the `notifications` table with type, actor, linked post/comment, and read status.
- FR-NOTIF-3: The notification bell in the header shows an unread count badge. The badge updates in real-time via the SSE stream subscribed to Redis channel `notifications:[userId]`.
- FR-NOTIF-4: Clicking the bell opens the notifications page (`/notifications`). Viewing the page marks all notifications as read.
- FR-NOTIF-5: Each notification links to the relevant post or comment.

---

### FR-SEARCH — Search

- FR-SEARCH-1: The global search bar in the header queries Meilisearch across three indexes: posts, communities, users.
- FR-SEARCH-2: Search results are returned via `/api/search`, which proxies to the local Meilisearch instance.
- FR-SEARCH-3: Meilisearch indexes are kept in sync asynchronously via BullMQ. After a DB write (post created, community created, user signed up or updated), a job is enqueued. A BullMQ worker processes the job and calls the Meilisearch index API.
- FR-SEARCH-4: If Meilisearch sync fails, the error is logged and the write is not retried automatically in Phase 1.
- FR-SEARCH-5: Search is available to guests and authenticated users.

---

### FR-REALTIME — Real-time

- FR-RT-1: Authenticated users maintain a single persistent SSE connection to `/api/sse`.
- FR-RT-2: The SSE connection is multiplexed: it carries new comment events for the currently viewed post and notification events for the logged-in user.
- FR-RT-3: Comment events are published to Redis channel `post:[id]:comments` by the comment creation handler.
- FR-RT-4: Notification events are published to Redis channel `notifications:[userId]` by the notification creation handler.
- FR-RT-5: The SSE handler subscribes to the relevant Redis channels on connection and unsubscribes on disconnect.
- FR-RT-6: Online member count is maintained via Redis presence sets refreshed on SSE heartbeat (every 30 seconds).

---

## 6. User Flows

### Sign In
1. Guest clicks "Login" in the header.
2. Better Auth redirects to Google OAuth consent screen.
3. Google redirects back to `/api/auth/callback/google`.
4. Better Auth creates or updates the user record.
5. User is redirected to the page they were on before signing in.

### Create a Post
1. Authenticated user clicks "Create Post" or navigates to `/submit`.
2. Selects a community from the dropdown (pre-filled if coming from a community page).
3. Selects post type: Text, Image, or Link.
4. Fills in title (required), body/URL/image (optional), flair (optional).
5. For Image: file picker opens, image uploads immediately to MinIO on pick, thumbnail preview shown.
6. For Link: URL entered, preview generated server-side on submit.
7. User submits. Post is saved to DB. A BullMQ job is enqueued to index the post in Meilisearch. User is redirected to the new post's detail page.

### Vote on a Post or Comment
1. Authenticated user clicks the upvote or downvote arrow.
2. Client sends a POST request to the votes API.
3. Server runs a DB transaction: insert/update/delete the vote row, update `score` on the post/comment, update `postKarma` or `commentKarma` on the author.
4. Client updates the vote UI optimistically (TanStack Query mutation).

### Comment on a Post
1. Authenticated user types in the Tiptap editor on the post detail page.
2. User submits. Comment is saved to DB.
3. Server publishes the new comment to Redis channel `post:[id]:comments`.
4. All clients with the SSE stream open for that post receive the comment and it appears in the thread.
5. A notification is created for the post author (or parent comment author). Published to `notifications:[userId]`.

### Search
1. User types in the search bar.
2. Client calls `/api/search?q=[query]` with debounce.
3. Server proxies the query to Meilisearch.
4. Results (posts, communities, users) are displayed in a dropdown.

---

## 7. Route Structure

| Route | Access | Description |
|---|---|---|
| `/` | Public | Home feed — all communities |
| `/u/[name]` | Public | Community feed |
| `/u/[name]/comments/[postId]` | Public | Post detail + threaded comments |
| `/u/[name]/comments/[postId]/[commentId]` | Public | Sub-thread view starting from a deep comment |
| `/submit` | Auth required | Create post |
| `/submit?community=[name]` | Auth required | Create post with community pre-filled |
| `/user/[username]` | Public | User profile |
| `/notifications` | Auth required | Notifications list |
| `/settings` | Auth required | User settings |

### API Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/[...all]` | GET, POST | — | Better Auth handler |
| `/api/posts` | GET | Public | Feed — supports `cursor`, `sort`, `communityId` params |
| `/api/posts` | POST | Required | Create a post |
| `/api/posts/[id]` | GET | Public | Single post |
| `/api/posts/[id]/comments` | GET | Public | Comments for a post |
| `/api/posts/[id]/comments` | POST | Required | Create a comment |
| `/api/posts/[id]/vote` | POST | Required | Vote on a post |
| `/api/comments/[id]/vote` | POST | Required | Vote on a comment |
| `/api/communities` | POST | Required | Create a community |
| `/api/communities/[name]/join` | POST | Required | Join a community |
| `/api/communities/[name]/leave` | POST | Required | Leave a community |
| `/api/upload` | POST | Required | Request MinIO presigned upload URL |
| `/api/search` | GET | Public | Search proxy to Meilisearch |
| `/api/sse` | GET | Required | SSE stream (comments + notifications) |
| `/api/notifications/read` | POST | Required | Mark all notifications as read |

---

## 8. Data Model

| Table | Key columns |
|---|---|
| `users` | id, name, email, image (avatar URL), banner, bio, postKarma, commentKarma, createdAt |
| `sessions` | Better Auth managed |
| `accounts` | Better Auth managed |
| `communities` | id, name (slug), displayName, description, icon, banner, creatorId → users, memberCount, createdAt |
| `communityMembers` | communityId → communities, userId → users — composite PK |
| `communityRules` | id, communityId → communities, title, description, order |
| `flairs` | id, communityId → communities, name, color (hex) |
| `posts` | id, title, content (jsonb), type (text/image/link), imageUrl, linkUrl, linkPreviewTitle, linkPreviewDescription, linkPreviewImage, authorId → users, communityId → communities, flairId → flairs, score, commentCount, createdAt |
| `postVotes` | postId → posts, userId → users, value (+1 or -1) — composite PK |
| `comments` | id, content (jsonb), postId → posts, authorId → users, parentId → comments (self-ref), depth, score, createdAt |
| `commentVotes` | commentId → comments, userId → users, value (+1 or -1) — composite PK |
| `savedPosts` | postId → posts, userId → users — composite PK |
| `savedComments` | commentId → comments, userId → users — composite PK |
| `hiddenPosts` | postId → posts, userId → users — composite PK |
| `recentCommunities` | userId → users, communityId → communities, visitedAt — composite PK, max 5 rows per user |
| `notifications` | id, userId → users (recipient), type (post_reply / comment_reply / mention), actorId → users, postId → posts, commentId → comments, read, createdAt |

**Key schema rules:**
- All foreign key columns are indexed.
- `posts.score` and `posts.commentCount` are denormalized — updated in the same transaction as the triggering write.
- `comments.depth` is computed on insert from the parent's depth + 1.
- `users.postKarma` and `users.commentKarma` are updated in the same transaction as every vote.

---

## 9. Non-Functional Requirements

### Performance
- Home feed first page must render server-side (SSR) for fast initial load.
- Feed queries use cursor-based pagination — no `OFFSET` queries.
- Denormalized `score`, `commentCount`, and karma columns eliminate aggregation queries on hot paths.
- Meilisearch handles search — no full-text queries hit PostgreSQL.

### Security
- All mutating API routes verify the session server-side before processing.
- MinIO presigned URLs expire after 60 seconds and are scoped to a single object key.
- The Meilisearch API and MinIO admin console are not exposed publicly — local Docker network only.
- `open-graph-scraper` runs server-side; the client never fetches arbitrary external URLs directly.

### Accessibility
- shadcn/ui components are built on Radix UI primitives — keyboard navigable and screen reader compatible out of the box.
- Color contrast must meet WCAG AA for both light and dark themes.

### Responsiveness
- The application is mobile responsive. The sidebar collapses on small screens. The feed takes full width on mobile.

### Theme
- Follows the OS system dark/light preference via Tailwind's `dark` variant. No manual toggle.

---

## 10. Infrastructure (Docker Compose)

| Service | Image | Purpose | Port |
|---|---|---|---|
| `postgres` | postgres:16 | Primary database | 5432 |
| `redis` | redis:7 | Pub/sub (SSE), BullMQ job queue, presence sets | 6379 |
| `minio` | minio/minio | Object storage for images | 9000 (API), 9001 (console) |
| `meilisearch` | getmeili/meilisearch | Full-text search engine | 7700 |

Next.js (`bun dev`) runs outside Docker and connects to the above services via `localhost`.

---

## 11. Seed Data

- 5 communities, each with an icon, banner, description, and 2–3 rules
- 20 users with fake names, avatars, and bios
- 50 posts: mix of text, image, and link types across communities, with varied flair tags
- 200 comments with nested threads of varying depth (up to depth 4)
- Vote data distributed across posts and comments for realistic scores
- Fake data generated with `@faker-js/faker`
- Script: `packages/db/src/seed.ts`, run with `bun run seed`

---

## 12. Glossary

| Term | Meaning |
|---|---|
| Community | A named group where posts are organized, equivalent to a subreddit. URL: `/u/[name]` |
| Flair | A colored label tag attached to a post, specific to a community |
| Score | Upvotes minus downvotes on a post or comment, stored as a denormalized integer |
| Karma | Running total of votes received on a user's posts (postKarma) or comments (commentKarma) |
| Cursor | An opaque token representing the last item seen, used for infinite scroll pagination |
| SSE | Server-Sent Events — a unidirectional HTTP stream from server to client |
| Presigned URL | A time-limited MinIO URL that allows a client to upload directly to object storage |
| BullMQ | A Redis-backed job queue used for async Meilisearch sync |
