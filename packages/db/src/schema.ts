import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const postTypeEnum = pgEnum("post_type", ["text", "image", "link"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "post_reply",
  "comment_reply",
  "mention",
]);

// ─── Better Auth tables ───────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  banner: text("banner"),
  bio: text("bio"),
  postKarma: integer("post_karma").notNull().default(0),
  commentKarma: integer("comment_karma").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Communities ──────────────────────────────────────────────────────────────

export const communities = pgTable("communities", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  icon: text("icon"),
  banner: text("banner"),
  creatorId: text("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  memberCount: integer("member_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("communities_creator_id_idx").on(t.creatorId),
]);

export const communityMembers = pgTable("community_members", {
  communityId: text("community_id")
    .notNull()
    .references(() => communities.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.communityId, t.userId] }),
  index("community_members_user_id_idx").on(t.userId),
]);

export const communityRules = pgTable("community_rules", {
  id: text("id").primaryKey(),
  communityId: text("community_id")
    .notNull()
    .references(() => communities.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
}, (t) => [
  index("community_rules_community_id_idx").on(t.communityId),
]);

export const flairs = pgTable("flairs", {
  id: text("id").primaryKey(),
  communityId: text("community_id")
    .notNull()
    .references(() => communities.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull(),
}, (t) => [
  index("flairs_community_id_idx").on(t.communityId),
]);

// ─── Posts ────────────────────────────────────────────────────────────────────

export const posts = pgTable("posts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  type: postTypeEnum("type").notNull().default("text"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  linkPreviewTitle: text("link_preview_title"),
  linkPreviewDescription: text("link_preview_description"),
  linkPreviewImage: text("link_preview_image"),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  communityId: text("community_id")
    .notNull()
    .references(() => communities.id, { onDelete: "cascade" }),
  flairId: text("flair_id").references(() => flairs.id, {
    onDelete: "set null",
  }),
  score: integer("score").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("posts_author_id_idx").on(t.authorId),
  index("posts_community_id_idx").on(t.communityId),
  index("posts_flair_id_idx").on(t.flairId),
  index("posts_created_at_idx").on(t.createdAt),
  index("posts_score_idx").on(t.score),
]);

export const postVotes = pgTable("post_votes", {
  postId: text("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  value: integer("value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.postId, t.userId] }),
  index("post_votes_user_id_idx").on(t.userId),
]);

// ─── Comments ─────────────────────────────────────────────────────────────────

export const comments = pgTable("comments", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  postId: text("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  parentId: text("parent_id"),
  depth: integer("depth").notNull().default(0),
  score: integer("score").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("comments_post_id_idx").on(t.postId),
  index("comments_author_id_idx").on(t.authorId),
  index("comments_parent_id_idx").on(t.parentId),
]);

export const commentVotes = pgTable("comment_votes", {
  commentId: text("comment_id")
    .notNull()
    .references(() => comments.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  value: integer("value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.commentId, t.userId] }),
  index("comment_votes_user_id_idx").on(t.userId),
]);

// ─── User actions ─────────────────────────────────────────────────────────────

export const savedPosts = pgTable("saved_posts", {
  postId: text("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  savedAt: timestamp("saved_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.postId, t.userId] }),
  index("saved_posts_user_id_idx").on(t.userId),
]);

export const savedComments = pgTable("saved_comments", {
  commentId: text("comment_id")
    .notNull()
    .references(() => comments.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  savedAt: timestamp("saved_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.commentId, t.userId] }),
  index("saved_comments_user_id_idx").on(t.userId),
]);

export const hiddenPosts = pgTable("hidden_posts", {
  postId: text("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  hiddenAt: timestamp("hidden_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.postId, t.userId] }),
  index("hidden_posts_user_id_idx").on(t.userId),
]);

export const recentCommunities = pgTable("recent_communities", {
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  communityId: text("community_id")
    .notNull()
    .references(() => communities.id, { onDelete: "cascade" }),
  visitedAt: timestamp("visited_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.communityId] }),
  index("recent_communities_visited_at_idx").on(t.visitedAt),
]);

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  actorId: text("actor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  postId: text("post_id").references(() => posts.id, { onDelete: "cascade" }),
  commentId: text("comment_id").references(() => comments.id, {
    onDelete: "cascade",
  }),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("notifications_user_id_idx").on(t.userId),
  index("notifications_created_at_idx").on(t.createdAt),
]);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  posts: many(posts),
  comments: many(comments),
  communityMembers: many(communityMembers),
  postVotes: many(postVotes),
  commentVotes: many(commentVotes),
  savedPosts: many(savedPosts),
  savedComments: many(savedComments),
  hiddenPosts: many(hiddenPosts),
  recentCommunities: many(recentCommunities),
  notifications: many(notifications),
  createdCommunities: many(communities),
}));

export const communitiesRelations = relations(communities, ({ one, many }) => ({
  creator: one(users, { fields: [communities.creatorId], references: [users.id] }),
  members: many(communityMembers),
  rules: many(communityRules),
  flairs: many(flairs),
  posts: many(posts),
  recentVisitors: many(recentCommunities),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  community: one(communities, { fields: [posts.communityId], references: [communities.id] }),
  flair: one(flairs, { fields: [posts.flairId], references: [flairs.id] }),
  votes: many(postVotes),
  comments: many(comments),
  savedBy: many(savedPosts),
  hiddenBy: many(hiddenPosts),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  votes: many(commentVotes),
  savedBy: many(savedComments),
}));
