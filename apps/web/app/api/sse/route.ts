import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createRedisClient } from "@repo/db/redis";

export const dynamic = "force-dynamic";

const PRESENCE_TTL_SECONDS = 60;
const HEARTBEAT_MS = 30_000;

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const userId = session.user.id;
  const url = new URL(req.url);
  const postId = url.searchParams.get("postId");
  const communityId = url.searchParams.get("communityId");

  const subscriber = createRedisClient();
  const cmd = createRedisClient();

  const channels = [`notifications:${userId}`];
  if (postId) channels.push(`post:${postId}:comments`);

  const presenceKey = communityId ? `community:${communityId}:online` : null;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: string) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
      }

      subscriber.on("message", (channel, message) => {
        if (channel.startsWith("notifications:")) send("notification", message);
        else if (channel.endsWith(":comments")) send("comment", message);
      });

      await subscriber.subscribe(...channels);

      if (presenceKey) {
        await cmd.sadd(presenceKey, userId);
        await cmd.expire(presenceKey, PRESENCE_TTL_SECONDS);
      }

      send("ready", JSON.stringify({ channels }));

      const heartbeat = setInterval(async () => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          return;
        }
        if (presenceKey) {
          try {
            await cmd.sadd(presenceKey, userId);
            await cmd.expire(presenceKey, PRESENCE_TTL_SECONDS);
          } catch { /* ignore */ }
        }
      }, HEARTBEAT_MS);

      const cleanup = async () => {
        clearInterval(heartbeat);
        try { await subscriber.unsubscribe(); } catch { /* ignore */ }
        try { subscriber.disconnect(); } catch { /* ignore */ }
        if (presenceKey) {
          try { await cmd.srem(presenceKey, userId); } catch { /* ignore */ }
        }
        try { cmd.disconnect(); } catch { /* ignore */ }
        try { controller.close(); } catch { /* ignore */ }
      };

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
