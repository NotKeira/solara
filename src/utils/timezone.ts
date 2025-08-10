import { format, formatInTimeZone } from "date-fns-tz";
import { Database, users } from "@/database";
import { eq } from "drizzle-orm";

// Common timezone mappings for autocomplete
export const COMMON_TIMEZONES = [
  // Americas
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
  "America/Mexico_City",

  // Europe
  "Europe/London",
  "Europe/Dublin",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Madrid",
  "Europe/Amsterdam",
  "Europe/Brussels",
  "Europe/Vienna",
  "Europe/Prague",
  "Europe/Warsaw",
  "Europe/Stockholm",
  "Europe/Oslo",
  "Europe/Helsinki",
  "Europe/Copenhagen",
  "Europe/Zurich",
  "Europe/Athens",
  "Europe/Istanbul",
  "Europe/Moscow",

  // Asia/Pacific
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Bangkok",
  "Asia/Jakarta",
  "Asia/Manila",
  "Asia/Taipei",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Perth",
  "Australia/Brisbane",
  "Pacific/Auckland",

  // Africa
  "Africa/Cairo",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Africa/Casablanca",
];

// Country to timezone mapping for autocomplete
export const COUNTRY_TIMEZONES: Record<string, string[]> = {
  "United States": [
    "America/New_York", // Eastern
    "America/Chicago", // Central
    "America/Denver", // Mountain
    "America/Los_Angeles", // Pacific
    "America/Anchorage", // Alaska
    "Pacific/Honolulu", // Hawaii
  ],
  Canada: [
    "America/St_Johns", // Newfoundland
    "America/Halifax", // Atlantic
    "America/Toronto", // Eastern
    "America/Winnipeg", // Central
    "America/Edmonton", // Mountain
    "America/Vancouver", // Pacific
  ],
  "United Kingdom": ["Europe/London"],
  Ireland: ["Europe/Dublin"],
  France: ["Europe/Paris"],
  Germany: ["Europe/Berlin"],
  Italy: ["Europe/Rome"],
  Spain: ["Europe/Madrid"],
  Netherlands: ["Europe/Amsterdam"],
  Belgium: ["Europe/Brussels"],
  Switzerland: ["Europe/Zurich"],
  Austria: ["Europe/Vienna"],
  "Czech Republic": ["Europe/Prague"],
  Poland: ["Europe/Warsaw"],
  Sweden: ["Europe/Stockholm"],
  Norway: ["Europe/Oslo"],
  Finland: ["Europe/Helsinki"],
  Denmark: ["Europe/Copenhagen"],
  Greece: ["Europe/Athens"],
  Turkey: ["Europe/Istanbul"],
  Russia: [
    "Europe/Moscow", // Moscow Time
    "Asia/Yekaterinburg", // Yekaterinburg Time
    "Asia/Novosibirsk", // Novosibirsk Time
    "Asia/Krasnoyarsk", // Krasnoyarsk Time
    "Asia/Irkutsk", // Irkutsk Time
    "Asia/Yakutsk", // Yakutsk Time
    "Asia/Vladivostok", // Vladivostok Time
    "Asia/Magadan", // Magadan Time
    "Asia/Kamchatka", // Kamchatka Time
  ],
  Japan: ["Asia/Tokyo"],
  "South Korea": ["Asia/Seoul"],
  China: ["Asia/Shanghai"],
  "Hong Kong": ["Asia/Hong_Kong"],
  Singapore: ["Asia/Singapore"],
  Thailand: ["Asia/Bangkok"],
  Indonesia: [
    "Asia/Jakarta", // Western Indonesia Time
    "Asia/Makassar", // Central Indonesia Time
    "Asia/Jayapura", // Eastern Indonesia Time
  ],
  Philippines: ["Asia/Manila"],
  Taiwan: ["Asia/Taipei"],
  India: ["Asia/Kolkata"],
  UAE: ["Asia/Dubai"],
  "Saudi Arabia": ["Asia/Riyadh"],
  Australia: [
    "Australia/Perth", // Western Australia
    "Australia/Adelaide", // Central Australia
    "Australia/Darwin", // Northern Territory
    "Australia/Brisbane", // Queensland
    "Australia/Sydney", // New South Wales
    "Australia/Melbourne", // Victoria
    "Australia/Hobart", // Tasmania
  ],
  "New Zealand": ["Pacific/Auckland"],
  Brazil: [
    "America/Sao_Paulo", // Brasilia Time
    "America/Manaus", // Amazon Time
    "America/Fortaleza", // Brasilia Time (Northeast)
    "America/Noronha", // Fernando de Noronha Time
  ],
  Mexico: [
    "America/Mexico_City", // Central Time
    "America/Cancun", // Eastern Time
    "America/Chihuahua", // Mountain Time
    "America/Tijuana", // Pacific Time
  ],
  Egypt: ["Africa/Cairo"],
  Nigeria: ["Africa/Lagos"],
  "South Africa": ["Africa/Johannesburg"],
  Morocco: ["Africa/Casablanca"],
};

/**
 * Validates if a timezone string is a valid IANA timezone
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    format(new Date(), "yyyy-MM-dd HH:mm:ss zzz", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets a user's timezone from the database
 */
export async function getUserTimezone(userId: string): Promise<string | null> {
  try {
    const user = await Database.select({ timezone: users.timezone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user[0]?.timezone || null;
  } catch (error) {
    console.error("Error fetching user timezone:", error);
    return null;
  }
}

/**
 * Sets a user's timezone in the database
 */
export async function setUserTimezone(
  userId: string,
  username: string,
  timezone: string
): Promise<boolean> {
  if (!isValidTimezone(timezone)) {
    return false;
  }

  try {
    // Upsert user with timezone
    await Database.insert(users)
      .values({
        id: userId,
        username: username,
        timezone: timezone,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          timezone: timezone,
          username: username,
          updatedAt: new Date(),
        },
      });

    return true;
  } catch (error) {
    console.error("Error setting user timezone:", error);
    return false;
  }
}

/**
 * Formats current time in a user's timezone
 */
export function formatTimeInTimezone(
  timezone: string,
  date: Date = new Date()
): string {
  try {
    return formatInTimeZone(date, timezone, "yyyy-MM-dd HH:mm:ss zzz");
  } catch {
    return "Invalid timezone";
  }
}

/**
 * Gets a human-readable timezone display name
 */
export function getTimezoneDisplayName(timezone: string): string {
  try {
    const now = new Date();
    const formatted = formatInTimeZone(now, timezone, "zzz");
    return `${timezone} (${formatted})`;
  } catch {
    return timezone;
  }
}

/**
 * Filters timezones based on search query for autocomplete
 */
export function filterTimezones(query: string, limit: number = 25): string[] {
  const lowercaseQuery = query.toLowerCase();

  // First, try to match by country name
  const countryMatches: string[] = [];
  for (const [country, timezones] of Object.entries(COUNTRY_TIMEZONES)) {
    if (country.toLowerCase().includes(lowercaseQuery)) {
      countryMatches.push(...timezones);
    }
  }

  // Then, match by timezone name
  const timezoneMatches = COMMON_TIMEZONES.filter((tz) =>
    tz.toLowerCase().includes(lowercaseQuery)
  );

  // Combine and deduplicate
  const combined = [...new Set([...countryMatches, ...timezoneMatches])];

  return combined.slice(0, limit);
}

/**
 * Filters countries based on search query for autocomplete
 */
export function filterCountries(query: string, limit: number = 25): string[] {
  const lowercaseQuery = query.toLowerCase();
  return Object.keys(COUNTRY_TIMEZONES)
    .filter((country) => country.toLowerCase().includes(lowercaseQuery))
    .slice(0, limit);
}
