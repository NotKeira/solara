import {
  pgTable,
  text,
  timestamp,
  bigint,
  boolean,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";

// ========================
// CORE USER SYSTEM
// ========================

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Discord user ID
  username: text("username").notNull(),
  discriminator: text("discriminator"), // Legacy Discord discriminator
  globalName: text("global_name"), // Discord global display name
  avatar: text("avatar"),
  bot: boolean("bot").default(false).notNull(),
  system: boolean("system").default(false).notNull(),
  mfaEnabled: boolean("mfa_enabled").default(false).notNull(),
  verified: boolean("verified").default(false).notNull(),
  flags: integer("flags"),
  premiumType: integer("premium_type"),
  publicFlags: integer("public_flags"),
  // Bot-specific user data
  timezone: text("timezone"), // IANA timezone identifier (e.g., "America/New_York")
  locale: text("locale"), // User's preferred locale
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========================
// GUILD SYSTEM
// ========================

export const guilds = pgTable("guilds", {
  id: text("id").primaryKey(), // Discord guild ID
  name: text("name").notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  icon: text("icon"),
  description: text("description"),
  memberCount: integer("member_count").default(0),
  premiumTier: integer("premium_tier").default(0),
  premiumSubscriptionCount: integer("premium_subscription_count").default(0),
  preferredLocale: text("preferred_locale").default("en-US"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const guildMembers = pgTable("guild_members", {
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  guildId: text("guild_id")
    .notNull()
    .references(() => guilds.id, { onDelete: "cascade" }),
  nickname: text("nickname"),
  joinedAt: timestamp("joined_at"),
  premiumSince: timestamp("premium_since"),
  deaf: boolean("deaf").default(false).notNull(),
  mute: boolean("mute").default(false).notNull(),
  pending: boolean("pending").default(false).notNull(),
  timeoutUntil: timestamp("timeout_until"), // When user timeout expires
  roles: text("roles").array(), // Array of role IDs
  permissions: text("permissions"), // Calculated permissions bitfield
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const guildMembersPk = primaryKey({
  columns: [guildMembers.userId, guildMembers.guildId],
});

export const guildSettings = pgTable("guild_settings", {
  guildId: text("guild_id")
    .primaryKey()
    .references(() => guilds.id, { onDelete: "cascade" }),
  prefix: text("prefix").default("!"),
  // Logging channels
  modLogChannelId: text("mod_log_channel_id"),
  messageLogChannelId: text("message_log_channel_id"),
  joinLogChannelId: text("join_log_channel_id"),
  // Welcome/Farewell system
  welcomeChannelId: text("welcome_channel_id"),
  welcomeMessage: text("welcome_message"),
  farewellChannelId: text("farewell_channel_id"),
  farewellMessage: text("farewell_message"),
  // Auto-moderation settings
  autoModEnabled: boolean("auto_mod_enabled").default(false).notNull(),
  antiSpamEnabled: boolean("anti_spam_enabled").default(false).notNull(),
  antiRaidEnabled: boolean("anti_raid_enabled").default(false).notNull(),
  // Misc settings
  muteRoleId: text("mute_role_id"),
  maxWarnings: integer("max_warnings").default(3),
  warningExpiry: bigint("warning_expiry", { mode: "number" }).default(
    2592000000
  ), // 30 days in ms
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========================
// MODERATION SYSTEM
// ========================

export const moderationActions = pgTable("moderation_actions", {
  id: text("id").primaryKey(), // UUID
  type: text("type").notNull(), // 'ban', 'kick', 'timeout', 'warn', 'unban', 'untimeout'
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  guildId: text("guild_id")
    .notNull()
    .references(() => guilds.id, { onDelete: "cascade" }),
  moderatorId: text("moderator_id")
    .notNull()
    .references(() => users.id),
  reason: text("reason"),
  evidence: text("evidence"), // Links to messages/images/etc
  duration: bigint("duration", { mode: "number" }), // Duration in milliseconds
  active: boolean("active").default(true).notNull(),
  appealed: boolean("appealed").default(false).notNull(),
  appealReason: text("appeal_reason"),
  appealedAt: timestamp("appealed_at"),
  appealedBy: text("appealed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export const warnings = pgTable("warnings", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  guildId: text("guild_id")
    .notNull()
    .references(() => guilds.id, { onDelete: "cascade" }),
  moderatorId: text("moderator_id")
    .notNull()
    .references(() => users.id),
  reason: text("reason").notNull(),
  evidence: text("evidence"),
  active: boolean("active").default(true).notNull(),
  acknowledged: boolean("acknowledged").default(false).notNull(),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

// ========================
// AUTO-MODERATION SYSTEM
// ========================

export const autoModRules = pgTable("auto_mod_rules", {
  id: text("id").primaryKey(), // UUID
  guildId: text("guild_id")
    .notNull()
    .references(() => guilds.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'spam', 'profanity', 'caps', 'links', 'mentions', 'emoji', 'repeated_text'
  enabled: boolean("enabled").default(true).notNull(),
  // Actions
  action: text("action").notNull(), // 'delete', 'timeout', 'warn', 'ban', 'kick'
  deleteMessage: boolean("delete_message").default(true).notNull(),
  sendAlert: boolean("send_alert").default(true).notNull(),
  // Thresholds and limits
  threshold: integer("threshold"), // Trigger threshold (messages per timeframe, etc.)
  timeWindow: integer("time_window"), // Time window in seconds
  duration: bigint("duration", { mode: "number" }), // Punishment duration in ms
  // Exemptions
  exemptRoles: text("exempt_roles").array(), // Role IDs exempt from this rule
  exemptChannels: text("exempt_channels").array(), // Channel IDs exempt from this rule
  exemptUsers: text("exempt_users").array(), // User IDs exempt from this rule
  // Rule-specific configuration (JSON)
  configuration: text("configuration"), // JSON string for rule-specific config
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========================
// TYPE EXPORTS
// ========================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Guild = typeof guilds.$inferSelect;
export type NewGuild = typeof guilds.$inferInsert;

export type GuildMember = typeof guildMembers.$inferSelect;
export type NewGuildMember = typeof guildMembers.$inferInsert;

export type GuildSettings = typeof guildSettings.$inferSelect;
export type NewGuildSettings = typeof guildSettings.$inferInsert;

export type ModerationAction = typeof moderationActions.$inferSelect;
export type NewModerationAction = typeof moderationActions.$inferInsert;

export type Warning = typeof warnings.$inferSelect;
export type NewWarning = typeof warnings.$inferInsert;

export type AutoModRule = typeof autoModRules.$inferSelect;
export type NewAutoModRule = typeof autoModRules.$inferInsert;
