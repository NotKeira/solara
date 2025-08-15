import { Database } from "@/database";
import { guilds, users } from "@/database/schema";

/**
 * Ensures a guild exists in the database before creating moderation cases.
 * This prevents foreign key constraint violations.
 */
export async function ensureGuildExists(
  guildId: string,
  guildName: string,
  ownerId: string
): Promise<void> {
  try {
    // Try to insert the guild, ignore if it already exists
    await Database.insert(guilds)
      .values({
        id: guildId,
        name: guildName,
        ownerId: ownerId,
      })
      .onConflictDoNothing();
  } catch (error) {
    console.error("Error ensuring guild exists:", error);
    // Don't throw here, as the guild might already exist
  }
}

/**
 * Stores or updates a user in the database.
 * Used by moderation commands to ensure users exist before creating cases.
 */
export async function storeUser(user: any): Promise<void> {
  await Database.insert(users)
    .values({
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      globalName: user.globalName,
      avatar: user.avatar,
      bot: user.bot,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        username: user.username,
        discriminator: user.discriminator,
        globalName: user.globalName,
        avatar: user.avatar,
        updatedAt: new Date(),
      },
    });
}
