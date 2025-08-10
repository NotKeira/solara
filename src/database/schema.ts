import {
  pgTable,
  text,
  timestamp,
  bigint,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

export const guilds = pgTable("guilds", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const guildMembers = pgTable("guild_members", {
  userId: text("user_id").notNull(),
  guildId: text("guild_id").notNull(),
  nickname: text("nickname"),
  joinedAt: timestamp("joined_at"),
  premiumSince: timestamp("premium_since"),
  deaf: boolean("deaf").default(false).notNull(),
  mute: boolean("mute").default(false).notNull(),
  pending: boolean("pending").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const moderationActions = pgTable("moderation_actions", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // 'ban', 'kick', 'timeout', 'warn'
  userId: text("user_id").notNull(),
  guildId: text("guild_id").notNull(),
  moderatorId: text("moderator_id").notNull(),
  reason: text("reason"),
  duration: bigint("duration", { mode: "number" }), // in milliseconds
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export const guildSettings = pgTable("guild_settings", {
  guildId: text("guild_id").primaryKey(),
  prefix: text("prefix").default("!"),
  modLogChannelId: text("mod_log_channel_id"),
  autoModEnabled: boolean("auto_mod_enabled").default(false).notNull(),
  welcomeChannelId: text("welcome_channel_id"),
  welcomeMessage: text("welcome_message"),
  farewellChannelId: text("farewell_channel_id"),
  farewellMessage: text("farewell_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const autoModRules = pgTable("auto_mod_rules", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'spam', 'profanity', 'caps', 'links'
  enabled: boolean("enabled").default(true).notNull(),
  action: text("action").notNull(), // 'delete', 'timeout', 'warn', 'ban'
  threshold: integer("threshold"),
  duration: bigint("duration", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Guild = typeof guilds.$inferSelect;
export type NewGuild = typeof guilds.$inferInsert;

export type GuildMember = typeof guildMembers.$inferSelect;
export type NewGuildMember = typeof guildMembers.$inferInsert;

export type ModerationAction = typeof moderationActions.$inferSelect;
export type NewModerationAction = typeof moderationActions.$inferInsert;

export type GuildSettings = typeof guildSettings.$inferSelect;
export type NewGuildSettings = typeof guildSettings.$inferInsert;

export type AutoModRule = typeof autoModRules.$inferSelect;
export type NewAutoModRule = typeof autoModRules.$inferInsert;
