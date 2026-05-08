#!/usr/bin/env bun
/**
 * End-to-end smoke test for the ureddit API.
 *
 * Exercises auth → community → post → comment → vote → search → notifications → SSE
 * against a running dev server at http://localhost:3000.
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

let cookie = "";
let pass = 0;
let fail = 0;
const failures: string[] = [];

function logStep(name: string, ok: boolean, extra?: string) {
  const tag = ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
  console.log(`${tag} ${name}${extra ? ` — ${extra}` : ""}`);
  if (ok) pass++;
  else { fail++; failures.push(name); }
}

async function req(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(init.headers ?? {}),
    },
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    // Capture session cookie from Better Auth
    const match = setCookie.split(",").find((c) => c.includes("better-auth"));
    if (match) cookie = match.split(";")[0]!.trim();
  }
  return res;
}

async function reqJson<T = unknown>(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: T | null }> {
  const res = await req(path, init);
  let data: T | null = null;
  try { data = (await res.json()) as T; } catch { /* non-JSON */ }
  return { ok: res.ok, status: res.status, data };
}

const ts = Date.now();
const username = `smoke_${ts}`;
const email = `smoke_${ts}@example.com`;
const password = "password1234";
const communityName = `smoke_${ts}`;

console.log(`\n→ smoke test against ${BASE} (user=${username})\n`);

// 1. Sign up
{
  const r = await reqJson("/api/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify({ email, password, name: username }),
  });
  logStep("sign-up", r.ok && cookie !== "", `status=${r.status}`);
}

// 2. Verify session
{
  const r = await reqJson<{ user?: { name?: string } }>("/api/auth/get-session");
  const ok = r.ok && r.data?.user?.name === username;
  logStep("get-session", ok, `user=${r.data?.user?.name ?? "?"}`);
}

// 3. Create community
let communityId = "";
{
  const r = await reqJson<{ id: string; name: string }>("/api/communities", {
    method: "POST",
    body: JSON.stringify({ name: communityName, displayName: "Smoke Test", description: "smoke" }),
  });
  communityId = r.data?.id ?? "";
  logStep("POST /api/communities", r.ok && communityId.length > 0, `id=${communityId}`);
}

// 4. List communities
{
  const r = await reqJson<{ id: string }[]>("/api/communities/list");
  const ok = r.ok && Array.isArray(r.data) && r.data.some((c) => c.id === communityId);
  logStep("GET /api/communities/list", ok, `count=${r.data?.length ?? 0}`);
}

// 5. Create text post
let postId = "";
{
  const r = await reqJson<{ post: { id: string }; communityName: string }>("/api/posts", {
    method: "POST",
    body: JSON.stringify({
      title: "Smoke title",
      type: "text",
      content: JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "hello world" }] }] }),
      communityId,
    }),
  });
  postId = r.data?.post.id ?? "";
  logStep("POST /api/posts", r.ok && postId.length > 0, `id=${postId}`);
}

// 6. Fetch feed
{
  const r = await reqJson<{ posts: { id: string }[] }>("/api/posts");
  const ok = r.ok && r.data?.posts.some((p) => p.id === postId);
  logStep("GET /api/posts (feed)", ok, `posts=${r.data?.posts.length ?? 0}`);
}

// 7. Comment on post
let commentId = "";
{
  const r = await reqJson<{ id: string }>(`/api/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({
      content: JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "first comment" }] }] }),
    }),
  });
  commentId = r.data?.id ?? "";
  logStep("POST comment", r.ok && commentId.length > 0, `id=${commentId}`);
}

// 8. List comments
{
  const r = await reqJson<{ id: string }[]>(`/api/posts/${postId}/comments`);
  const ok = r.ok && Array.isArray(r.data) && r.data.some((c) => c.id === commentId);
  logStep("GET comments", ok, `count=${r.data?.length ?? 0}`);
}

// 9. Vote post up
{
  const r = await reqJson<{ newValue: number }>(`/api/posts/${postId}/vote`, {
    method: "POST",
    body: JSON.stringify({ value: 1 }),
  });
  logStep("POST post vote", r.ok && r.data?.newValue === 1, `newValue=${r.data?.newValue}`);
}

// 10. Vote comment up
{
  const r = await reqJson<{ newValue: number }>(`/api/comments/${commentId}/vote`, {
    method: "POST",
    body: JSON.stringify({ value: 1 }),
  });
  logStep("POST comment vote", r.ok && r.data?.newValue === 1, `newValue=${r.data?.newValue}`);
}

// 11. Save post
{
  const r = await req(`/api/posts/${postId}/save`, { method: "POST" });
  logStep("POST save", r.ok, `status=${r.status}`);
}

// 12. Profile endpoints
{
  const r = await reqJson<{ name: string }>(`/api/users/${username}`);
  logStep("GET /api/users/[username]", r.ok && r.data?.name === username);
}
{
  const r = await reqJson<unknown[]>(`/api/users/${username}/posts`);
  logStep("GET user posts", r.ok && Array.isArray(r.data) && r.data.length >= 1);
}
{
  const r = await reqJson<unknown[]>(`/api/users/${username}/comments`);
  logStep("GET user comments", r.ok && Array.isArray(r.data) && r.data.length >= 1);
}
{
  const r = await reqJson<{ posts: unknown[]; comments: unknown[] }>(`/api/users/me/saved`);
  logStep("GET saved", r.ok && Array.isArray(r.data?.posts) && (r.data?.posts.length ?? 0) >= 1);
}

// 13. Notifications + unread count
{
  const r = await reqJson<{ count: number }>("/api/notifications/unread-count");
  logStep("GET unread-count", r.ok, `count=${r.data?.count}`);
}
{
  const r = await reqJson<unknown[]>("/api/notifications");
  logStep("GET notifications", r.ok && Array.isArray(r.data));
}

// 14. Online presence (no SSE connected → expect 0)
{
  const r = await reqJson<{ count: number }>(`/api/communities/${communityName}/online`);
  logStep("GET community online", r.ok, `count=${r.data?.count}`);
}

// 15. Search — Meili sync is async; give the worker a beat then poll.
{
  let found = false;
  for (let i = 0; i < 10 && !found; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const r = await reqJson<{ posts: unknown[]; communities: { id: string }[]; users: unknown[] }>(`/api/search?q=${encodeURIComponent(communityName)}`);
    if (r.ok && r.data?.communities.some((c) => c.id === communityId)) {
      found = true;
      break;
    }
  }
  logStep("GET search (Meili indexed)", found, found ? "indexed" : "no community hit after 5s");
}

// 16. SSE — open a stream, watch for "ready" event, then publish a comment in another request.
{
  const ctrl = new AbortController();
  const sseRes = await fetch(`${BASE}/api/sse?postId=${postId}&communityId=${communityId}`, {
    headers: { Cookie: cookie },
    signal: ctrl.signal,
  });
  const reader = sseRes.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let sawReady = false;
  let sawComment = false;
  let triggered = false;

  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    const { value, done } = await Promise.race([
      reader.read(),
      new Promise<{ value: undefined; done: true }>((res) =>
        setTimeout(() => res({ value: undefined, done: true }), 250)
      ),
    ]);
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    if (!sawReady && buf.includes("event: ready")) {
      sawReady = true;
      // Once the SSE handler is subscribed, post a second comment to trigger.
      if (!triggered) {
        triggered = true;
        reqJson(`/api/posts/${postId}/comments`, {
          method: "POST",
          body: JSON.stringify({
            content: JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "from sse trigger" }] }] }),
          }),
        }).catch(() => {});
      }
    }
    if (buf.includes("event: comment")) {
      sawComment = true;
      break;
    }
  }
  ctrl.abort();
  logStep("SSE ready event", sawReady);
  logStep("SSE comment delivery", sawComment);
}

// 17. Online count after SSE disconnected — should be back to 0
{
  // Wait briefly for cleanup
  await new Promise((r) => setTimeout(r, 300));
  const r = await reqJson<{ count: number }>(`/api/communities/${communityName}/online`);
  logStep("Online count after disconnect", r.ok && r.data?.count === 0, `count=${r.data?.count}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log("Failures:");
  failures.forEach((f) => console.log("  -", f));
  process.exit(1);
}
