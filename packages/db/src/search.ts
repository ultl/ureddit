import { Meilisearch as MeiliSearch } from "meilisearch";

export const meili = new MeiliSearch({
  host: process.env.MEILISEARCH_URL ?? "http://localhost:7700",
  apiKey: process.env.MEILISEARCH_MASTER_KEY ?? "ureddit-master-key",
});

export async function setupIndexes() {
  await meili.createIndex("posts", { primaryKey: "id" });
  await meili.createIndex("communities", { primaryKey: "id" });
  await meili.createIndex("users", { primaryKey: "id" });

  await meili.index("posts").updateSettings({
    searchableAttributes: ["title", "content", "linkPreviewTitle"],
    displayedAttributes: [
      "id", "title", "type", "authorId", "authorName",
      "communityId", "communityName", "score", "commentCount", "createdAt",
    ],
    sortableAttributes: ["score", "createdAt"],
  });

  await meili.index("communities").updateSettings({
    searchableAttributes: ["name", "displayName", "description"],
    displayedAttributes: ["id", "name", "displayName", "description", "icon", "memberCount"],
  });

  await meili.index("users").updateSettings({
    searchableAttributes: ["name", "email"],
    displayedAttributes: ["id", "name", "image", "postKarma", "commentKarma"],
  });
}
