import { Queue } from "bullmq";
import { createRedisClient } from "./redis";

export type SyncJobData =
  | { type: "post"; id: string }
  | { type: "community"; id: string }
  | { type: "user"; id: string };

export const syncQueue = new Queue<SyncJobData>("search-sync", {
  connection: createRedisClient(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export async function enqueueSyncPost(id: string) {
  await syncQueue.add("sync-post", { type: "post", id });
}

export async function enqueueSyncCommunity(id: string) {
  await syncQueue.add("sync-community", { type: "community", id });
}

export async function enqueueSyncUser(id: string) {
  await syncQueue.add("sync-user", { type: "user", id });
}
