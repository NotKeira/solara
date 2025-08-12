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
  // Welcome system
  welcomeEnabled: boolean("welcome_enabled").default(false).notNull(),
  welcomeChannelId: text("welcome_channel_id"),
  welcomeMessage: text("welcome_message"),
  // Leave system
  leaveEnabled: boolean("leave_enabled").default(false).notNull(),
  leaveChannelId: text("leave_channel_id"),
  leaveMessage: text("leave_message"),
  // Auto-moderation settings
  autoModEnabled: boolean("auto_mod_enabled").default(false).notNull(),
  antiSpamEnabled: boolean("anti_spam_enabled").default(false).notNull(),
  antiRaidEnabled: boolean("anti_raid_enabled").default(false).notNull(),
  // Moderation settings
  muteRoleId: text("mute_role_id"),
  maxWarnings: integer("max_warnings").default(3),
  warningExpiry: bigint("warning_expiry", { mode: "number" }).default(
    2592000000
  ), // 30 days in ms
  // Case system settings
  caseNumbering: text("case_numbering").default("auto").notNull(), // 'auto', 'manual'
  caseDmEnabled: boolean("case_dm_enabled").default(true).notNull(), // DM users about their cases
  publicCasesEnabled: boolean("public_cases_enabled").default(false).notNull(), // Allow public case viewing
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========================
// MODERATION CASE SYSTEM
// ========================

export const moderationCases = pgTable("moderation_cases", {
  id: text("id").primaryKey(), // Full UUID
  caseId: text("case_id").notNull(), // 10-character phone-friendly display ID
  guildId: text("guild_id")
    .notNull()
    .references(() => guilds.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'ban', 'kick', 'timeout', 'warn', 'unban', 'untimeout', 'note', 'massban', 'masskick', 'masswarn', 'massmute'
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  moderatorId: text("moderator_id")
    .notNull()
    .references(() => users.id),
  reason: text("reason"),
  reasonId: text("reason_id").references(() => predefinedReasons.id), // Link to predefined reason
  evidence: text("evidence").array(), // Array of links to messages/images/etc
  duration: bigint("duration", { mode: "number" }), // Duration in milliseconds
  active: boolean("active").default(true).notNull(),
  closed: boolean("closed").default(false).notNull(),
  closedAt: timestamp("closed_at"),
  closedBy: text("closed_by").references(() => users.id),
  closeReason: text("close_reason"),
  // Appeal system
  appealed: boolean("appealed").default(false).notNull(),
  appealReason: text("appeal_reason"),
  appealedAt: timestamp("appealed_at"),
  appealedBy: text("appealed_by").references(() => users.id),
  appealDecision: text("appeal_decision"), // 'approved', 'denied', 'pending'
  appealDecisionBy: text("appeal_decision_by").references(() => users.id),
  appealDecisionAt: timestamp("appeal_decision_at"),
  appealDecisionReason: text("appeal_decision_reason"),
  // Mass action reference
  massActionId: text("mass_action_id").references(() => massActions.id),
  // Metadata
  messageId: text("message_id"), // Discord message ID for the infraction
  channelId: text("channel_id"), // Discord channel ID where infraction occurred
  attachments: text("attachments").array(), // File attachments for evidence
  notes: text("notes"), // Internal moderator notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

// Mass moderation actions (for tracking bulk operations)
export const massActions = pgTable("mass_actions", {
  id: text("id").primaryKey(), // UUID
  guildId: text("guild_id")
    .notNull()
    .references(() => guilds.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'massban', 'masskick', 'masswarn', 'massmute'
  moderatorId: text("moderator_id")
    .notNull()
    .references(() => users.id),
  reason: text("reason"),
  reasonId: text("reason_id").references(() => predefinedReasons.id),
  targetCount: integer("target_count").notNull(), // Total users targeted
  successCount: integer("success_count").default(0).notNull(), // Successfully processed
  failureCount: integer("failure_count").default(0).notNull(), // Failed to process
  status: text("status").default("pending").notNull(), // 'pending', 'in_progress', 'completed', 'failed'
  duration: bigint("duration", { mode: "number" }), // For mass mutes/timeouts
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Predefined reasons system
export const predefinedReasons = pgTable("predefined_reasons", {
  id: text("id").primaryKey(), // UUID
  guildId: text("guild_id")
    .notNull()
    .references(() => guilds.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // Display name for the reason
  reason: text("reason").notNull(), // The actual reason text
  type: text("type").notNull(), // 'ban', 'kick', 'timeout', 'warn', 'unban', 'untimeout', 'note', 'all'
  duration: bigint("duration", { mode: "number" }), // Default duration for this reason (optional)
  severity: integer("severity").default(1).notNull(), // 1-5 severity scale
  autoDelete: boolean("auto_delete").default(false).notNull(), // Auto-delete messages when using this reason
  active: boolean("active").default(true).notNull(),
  usageCount: integer("usage_count").default(0).notNull(), // Track how often it's used
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Case linking system (for cross-server case sharing)
export const caseLinks = pgTable("case_links", {
  id: text("id").primaryKey(), // UUID
  sourceGuildId: text("source_guild_id")
    .notNull()
    .references(() => guilds.id, { onDelete: "cascade" }),
  targetGuildId: text("target_guild_id")
    .notNull()
    .references(() => guilds.id, { onDelete: "cascade" }),
  linkType: text("link_type").default("bidirectional").notNull(), // 'bidirectional', 'source_to_target', 'target_to_source'
  active: boolean("active").default(true).notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Case updates/edits tracking
export const caseUpdates = pgTable("case_updates", {
  id: text("id").primaryKey(), // UUID
  caseId: text("case_id")
    .notNull()
    .references(() => moderationCases.id, { onDelete: "cascade" }),
  updatedBy: text("updated_by")
    .notNull()
    .references(() => users.id),
  field: text("field").notNull(), // Field that was updated
  oldValue: text("old_value"), // Previous value
  newValue: text("new_value"), // New value
  reason: text("reason"), // Reason for the update
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export type ModerationCase = typeof moderationCases.$inferSelect;
export type NewModerationCase = typeof moderationCases.$inferInsert;

export type MassAction = typeof massActions.$inferSelect;
export type NewMassAction = typeof massActions.$inferInsert;

export type PredefinedReason = typeof predefinedReasons.$inferSelect;
export type NewPredefinedReason = typeof predefinedReasons.$inferInsert;

export type CaseLink = typeof caseLinks.$inferSelect;
export type NewCaseLink = typeof caseLinks.$inferInsert;

export type CaseUpdate = typeof caseUpdates.$inferSelect;
export type NewCaseUpdate = typeof caseUpdates.$inferInsert;

export type AutoModRule = typeof autoModRules.$inferSelect;
export type NewAutoModRule = typeof autoModRules.$inferInsert;
