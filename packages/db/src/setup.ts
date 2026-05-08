import { setupIndexes } from "./search";
import { ensureBucketExists } from "./storage";

async function setup() {
  console.log("Setting up Meilisearch indexes...");
  await setupIndexes();
  console.log("✅ Meilisearch indexes ready");

  console.log("Setting up MinIO bucket...");
  await ensureBucketExists();
  console.log("✅ MinIO bucket ready");
}

setup().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
