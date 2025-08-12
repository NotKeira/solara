import { randomUUID } from "crypto";
import { Database } from "@/database";
import { moderationCases } from "@/database/schema";
import { eq, and, count, sql } from "drizzle-orm";

// Phone-friendly character set (excludes 0, 1, I, O for clarity)
const PHONE_FRIENDLY_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Generate a random case ID using phone-friendly characters
 */
function generateRandomCaseId(length: number = 10): string {
  let id = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * PHONE_FRIENDLY_CHARS.length);
    id += PHONE_FRIENDLY_CHARS[randomIndex];
  }
  return id;
}

/**
 * Generate a globally unique 10-character case ID using phone-friendly characters
 * Ensures the case ID is unique across ALL guilds in the entire bot
 */
export async function generateUniqueCaseId(): Promise<{
  id: string;
  caseId: string;
}> {
  let attempts = 0;
  const maxAttempts = 50; // Increased attempts for 10-char IDs

  while (attempts < maxAttempts) {
    const caseId = generateRandomCaseId(10);

    // Check if this case ID already exists GLOBALLY (across all guilds)
    const existingCase = await Database.select()
      .from(moderationCases)
      .where(eq(moderationCases.caseId, caseId))
      .limit(1);

    if (existingCase.length === 0) {
      // Generate a proper UUID for the internal ID
      const fullId = randomUUID();
      return { id: fullId, caseId };
    }

    attempts++;
  }

  // Fallback: use longer ID if we can't find a unique 10-char ID (extremely unlikely)
  const fallbackId = generateRandomCaseId(12);
  const fullId = randomUUID();
  return { id: fullId, caseId: fallbackId };
}

/**
 * Find a case by its globally unique case ID
 */
export async function findCaseById(caseId: string) {
  const cases = await Database.select()
    .from(moderationCases)
    .where(eq(moderationCases.caseId, caseId.toUpperCase()))
    .limit(1);

  return cases[0] || null;
}

/**
 * Find a case by its case ID but verify it belongs to the specified guild
 * Useful for guild-specific operations while maintaining global uniqueness
 */
export async function findCaseByIdInGuild(guildId: string, caseId: string) {
  const cases = await Database.select()
    .from(moderationCases)
    .where(
      and(
        eq(moderationCases.guildId, guildId),
        eq(moderationCases.caseId, caseId.toUpperCase())
      )
    )
    .limit(1);

  return cases[0] || null;
}

/**
 * Get case statistics for a guild
 */
export async function getCaseStats(guildId: string) {
  try {
    // Get total cases for the guild
    const totalCasesResult = await Database.select({ count: count() })
      .from(moderationCases)
      .where(eq(moderationCases.guildId, guildId));

    // Get active cases (not closed)
    const activeCasesResult = await Database.select({ count: count() })
      .from(moderationCases)
      .where(
        and(
          eq(moderationCases.guildId, guildId),
          eq(moderationCases.closed, false)
        )
      );

    // Get closed cases
    const closedCasesResult = await Database.select({ count: count() })
      .from(moderationCases)
      .where(
        and(
          eq(moderationCases.guildId, guildId),
          eq(moderationCases.closed, true)
        )
      );

    // Get appealed cases
    const appealedCasesResult = await Database.select({ count: count() })
      .from(moderationCases)
      .where(
        and(
          eq(moderationCases.guildId, guildId),
          eq(moderationCases.appealed, true)
        )
      );

    // Get cases by type
    const casesByTypeResult = await Database.select({
      type: moderationCases.type,
      count: count(),
    })
      .from(moderationCases)
      .where(eq(moderationCases.guildId, guildId))
      .groupBy(moderationCases.type);

    // Process cases by type into an object
    const casesByType = {
      ban: 0,
      kick: 0,
      timeout: 0,
      warn: 0,
      note: 0,
      unban: 0,
      untimeout: 0,
      massban: 0,
      masskick: 0,
      masswarn: 0,
      massmute: 0,
    };

    casesByTypeResult.forEach((row) => {
      if (row.type in casesByType) {
        casesByType[row.type as keyof typeof casesByType] = row.count;
      }
    });

    return {
      totalCases: totalCasesResult[0]?.count || 0,
      activeCases: activeCasesResult[0]?.count || 0,
      closedCases: closedCasesResult[0]?.count || 0,
      appealedCases: appealedCasesResult[0]?.count || 0,
      casesByType,
    };
  } catch (error) {
    console.error("Error fetching case statistics:", error);

    // Return default values if query fails
    return {
      totalCases: 0,
      activeCases: 0,
      closedCases: 0,
      appealedCases: 0,
      casesByType: {
        ban: 0,
        kick: 0,
        timeout: 0,
        warn: 0,
        note: 0,
        unban: 0,
        untimeout: 0,
        massban: 0,
        masskick: 0,
        masswarn: 0,
        massmute: 0,
      },
    };
  }
}

/**
 * Get cases for a specific user in a guild
 */
export async function getUserCases(
  guildId: string,
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    type?: string;
    activeOnly?: boolean;
  }
) {
  const { limit = 10, offset = 0, type, activeOnly = false } = options || {};

  let whereConditions = and(
    eq(moderationCases.guildId, guildId),
    eq(moderationCases.userId, userId)
  );

  if (type) {
    whereConditions = and(whereConditions, eq(moderationCases.type, type));
  }

  if (activeOnly) {
    whereConditions = and(whereConditions, eq(moderationCases.closed, false));
  }

  const cases = await Database.select()
    .from(moderationCases)
    .where(whereConditions)
    .orderBy(moderationCases.createdAt)
    .limit(limit)
    .offset(offset);

  return cases;
}

/**
 * Get recent cases for a guild
 */
export async function getRecentCases(guildId: string, limit: number = 10) {
  const cases = await Database.select()
    .from(moderationCases)
    .where(eq(moderationCases.guildId, guildId))
    .orderBy(moderationCases.createdAt)
    .limit(limit);

  return cases;
}

/**
 * Search cases by user ID, case ID, or reason
 */
export async function searchCases(
  guildId: string,
  query: string,
  options?: {
    limit?: number;
    offset?: number;
  }
) {
  const { limit = 20, offset = 0 } = options || {};

  // Search by case ID (exact match)
  if (isValidCaseId(query)) {
    const caseResult = await findCaseByIdInGuild(guildId, query);
    return caseResult ? [caseResult] : [];
  }

  // Search by user ID or in reason text
  const cases = await Database.select()
    .from(moderationCases)
    .where(
      and(
        eq(moderationCases.guildId, guildId),
        sql`(${moderationCases.userId} = ${query} OR ${
          moderationCases.reason
        } ILIKE ${"%" + query + "%"})`
      )
    )
    .orderBy(moderationCases.createdAt)
    .limit(limit)
    .offset(offset);

  return cases;
}

/**
 * Get active punishments for a user (bans, timeouts that haven't expired)
 */
export async function getActivePunishments(guildId: string, userId: string) {
  const now = new Date();

  const activePunishments = await Database.select()
    .from(moderationCases)
    .where(
      and(
        eq(moderationCases.guildId, guildId),
        eq(moderationCases.userId, userId),
        eq(moderationCases.active, true),
        eq(moderationCases.closed, false),
        sql`(${moderationCases.expiresAt} IS NULL OR ${moderationCases.expiresAt} > ${now})`
      )
    )
    .orderBy(moderationCases.createdAt);

  return activePunishments;
}

/**
 * Get moderation statistics for moderators in a guild
 */
export async function getModeratorStats(
  guildId: string,
  timeframe?: {
    startDate?: Date;
    endDate?: Date;
  }
) {
  const conditions = [eq(moderationCases.guildId, guildId)];

  if (timeframe?.startDate) {
    conditions.push(
      sql`${moderationCases.createdAt} >= ${timeframe.startDate}`
    );
  }

  if (timeframe?.endDate) {
    conditions.push(sql`${moderationCases.createdAt} <= ${timeframe.endDate}`);
  }

  const moderatorStats = await Database.select({
    moderatorId: moderationCases.moderatorId,
    type: moderationCases.type,
    count: count(),
  })
    .from(moderationCases)
    .where(and(...conditions))
    .groupBy(moderationCases.moderatorId, moderationCases.type)
    .orderBy(moderationCases.moderatorId);

  // Group by moderator
  const statsByModerator: Record<string, Record<string, number>> = {};

  moderatorStats.forEach((stat) => {
    statsByModerator[stat.moderatorId] ??= {};
    statsByModerator[stat.moderatorId]![stat.type] = stat.count;
  });

  return statsByModerator;
}

export function formatCaseId(caseId: string): string {
  return caseId.toUpperCase().substring(0, 10);
}

/**
 * Validate case ID format (10 characters, phone-friendly alphabet)
 */
export function isValidCaseId(caseId: string): boolean {
  if (caseId.length !== 10) return false;
  return /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{10}$/i.test(caseId);
}

/**
 * Calculate total possible combinations for 10-character phone-friendly IDs
 * With 31 characters, 10 positions = 31^10 = ~8.7 × 10^14 combinations
 */
export function calculateTotalCombinations(): number {
  return Math.pow(PHONE_FRIENDLY_CHARS.length, 10);
}

/**
 * Estimate collision probability for a given number of cases
 */
export function estimateCollisionProbability(numCases: number): number {
  const totalCombinations = calculateTotalCombinations();
  // Using birthday paradox approximation
  return 1 - Math.exp(-(numCases * (numCases - 1)) / (2 * totalCombinations));
}
