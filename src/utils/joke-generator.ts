import { readFileSync } from "fs";
import { join } from "path";

/**
 * Optimised joke message generator that provides contextual humorous responses
 * for various moderation actions. Uses external JSON data for better organisation
 * and follows British English conventions throughout.
 */
export class JokeMessageGenerator {
  private readonly jokeData: JokeData;
  private readonly fallbackMessages = {
    success:
      "I tried thinking of something funny but I must be a broken record... You can have a little guess what would've been here!",
    failure:
      "Well, that didn't work! But hey, at least I tried to be funny about it!",
  } as const;

  constructor() {
    this.jokeData = this.loadJokeData();
  }

  /**
   * Loads joke data from the external JSON file
   * @returns Parsed joke data structure
   */
  private loadJokeData(): JokeData {
    try {
      // Use process.cwd() as a fallback since __dirname is not available in ES modules when compiled to CommonJS
      const basePath =
        typeof __dirname !== "undefined"
          ? __dirname
          : process.cwd() + "/src/utils";
      const dataPath = join(basePath, "..", "data", "joke-messages.json");
      const rawData = readFileSync(dataPath, "utf-8");
      return JSON.parse(rawData) as JokeData;
    } catch (error) {
      console.error("Failed to load joke data:", error);
      // Return minimal structure to prevent crashes
      return {
        user: { self: {}, others: {} },
        bot: { self: {}, others: {} },
      } as JokeData;
    }
  }

  /**
   * Core message retrieval logic optimised for performance
   */
  private getMessage(
    context: Context,
    target: Target,
    action: Action,
    type: MessageType
  ): string {
    const contextData = this.jokeData[context];
    if (!contextData) return this.fallbackMessages[type];

    const targetData = contextData[target];
    if (!targetData) return this.fallbackMessages[type];

    const actionData = targetData[action];
    if (!actionData) return this.fallbackMessages[type];

    const messages = actionData[type];
    if (!messages || messages.length === 0) return this.fallbackMessages[type];

    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex] || this.fallbackMessages[type];
  }

  // Self-targeting success methods
  public banSelfSuccess(context: Context): string {
    return this.getMessage(context, "self", "ban", "success");
  }

  public unbanSelfSuccess(context: Context): string {
    return this.getMessage(context, "self", "unban", "success");
  }

  public kickSelfSuccess(context: Context): string {
    return this.getMessage(context, "self", "kick", "success");
  }

  public muteSelfSuccess(context: Context): string {
    return this.getMessage(context, "self", "mute", "success");
  }

  public timeoutSelfSuccess(context: Context): string {
    return this.getMessage(context, "self", "timeout", "success");
  }

  public warnSelfSuccess(context: Context): string {
    return this.getMessage(context, "self", "warn", "success");
  }

  public promoteSelfSuccess(context: Context): string {
    return this.getMessage(context, "self", "promote", "success");
  }

  public demoteSelfSuccess(context: Context): string {
    return this.getMessage(context, "self", "demote", "success");
  }

  public roleSelfSuccess(context: Context): string {
    return this.getMessage(context, "self", "role", "success");
  }

  public nicknameSelfSuccess(context: Context): string {
    return this.getMessage(context, "self", "nickname", "success");
  }

  // Self-targeting failure methods
  public banSelfFailure(context: Context): string {
    return this.getMessage(context, "self", "ban", "failure");
  }

  public unbanSelfFailure(context: Context): string {
    return this.getMessage(context, "self", "unban", "failure");
  }

  public kickSelfFailure(context: Context): string {
    return this.getMessage(context, "self", "kick", "failure");
  }

  public muteSelfFailure(context: Context): string {
    return this.getMessage(context, "self", "mute", "failure");
  }

  public timeoutSelfFailure(context: Context): string {
    return this.getMessage(context, "self", "timeout", "failure");
  }

  public warnSelfFailure(context: Context): string {
    return this.getMessage(context, "self", "warn", "failure");
  }

  public promoteSelfFailure(context: Context): string {
    return this.getMessage(context, "self", "promote", "failure");
  }

  public demoteSelfFailure(context: Context): string {
    return this.getMessage(context, "self", "demote", "failure");
  }

  public roleSelfFailure(context: Context): string {
    return this.getMessage(context, "self", "role", "failure");
  }

  public nicknameSelfFailure(context: Context): string {
    return this.getMessage(context, "self", "nickname", "failure");
  }

  // Other-targeting success methods
  public banOthersSuccess(context: Context): string {
    return this.getMessage(context, "others", "ban", "success");
  }

  public kickOthersSuccess(context: Context): string {
    return this.getMessage(context, "others", "kick", "success");
  }

  public muteOthersSuccess(context: Context): string {
    return this.getMessage(context, "others", "mute", "success");
  }

  public timeoutOthersSuccess(context: Context): string {
    return this.getMessage(context, "others", "timeout", "success");
  }

  public warnOthersSuccess(context: Context): string {
    return this.getMessage(context, "others", "warn", "success");
  }

  public unbanOthersSuccess(context: Context): string {
    return this.getMessage(context, "others", "unban", "success");
  }

  public promoteOthersSuccess(context: Context): string {
    return this.getMessage(context, "others", "promote", "success");
  }

  public demoteOthersSuccess(context: Context): string {
    return this.getMessage(context, "others", "demote", "success");
  }

  public roleOthersSuccess(context: Context): string {
    return this.getMessage(context, "others", "role", "success");
  }

  public nicknameOthersSuccess(context: Context): string {
    return this.getMessage(context, "others", "nickname", "success");
  }

  // Other-targeting failure methods
  public banOthersFailure(context: Context): string {
    return this.getMessage(context, "others", "ban", "failure");
  }

  public kickOthersFailure(context: Context): string {
    return this.getMessage(context, "others", "kick", "failure");
  }

  public muteOthersFailure(context: Context): string {
    return this.getMessage(context, "others", "mute", "failure");
  }

  public timeoutOthersFailure(context: Context): string {
    return this.getMessage(context, "others", "timeout", "failure");
  }

  public warnOthersFailure(context: Context): string {
    return this.getMessage(context, "others", "warn", "failure");
  }

  public unbanOthersFailure(context: Context): string {
    return this.getMessage(context, "others", "unban", "failure");
  }

  public promoteOthersFailure(context: Context): string {
    return this.getMessage(context, "others", "promote", "failure");
  }

  public demoteOthersFailure(context: Context): string {
    return this.getMessage(context, "others", "demote", "failure");
  }

  public roleOthersFailure(context: Context): string {
    return this.getMessage(context, "others", "role", "failure");
  }

  public nicknameOthersFailure(context: Context): string {
    return this.getMessage(context, "others", "nickname", "failure");
  }

  /**
   * Utility method to get a message with explicit success/failure specification.
   * This provides a cleaner API for cases where the outcome is determined dynamically.
   *
   * @param context Whether this is for a bot or user action
   * @param target Whether targeting self or others
   * @param action The specific action being performed
   * @param successful Whether the action was successful
   * @returns A humorous message string
   *
   * @example
   * ```typescript
   * const generator = new JokeMessageGenerator();
   * const message = generator.getMessageForAction('user', 'others', 'ban', true);
   * ```
   */
  public getMessageForAction(
    context: Context,
    target: Target,
    action: Action,
    successful: boolean
  ): string {
    return this.getMessage(
      context,
      target,
      action,
      successful ? "success" : "failure"
    );
  }

  /**
   * Batch retrieval method for getting multiple related messages.
   * Useful for complex interactions that might need both success and failure variants.
   *
   * @param context Whether this is for a bot or user action
   * @param target Whether targeting self or others
   * @param action The specific action being performed
   * @returns Object containing both success and failure messages
   */
  public getMessagePair(
    context: Context,
    target: Target,
    action: Action
  ): { success: string; failure: string } {
    return {
      success: this.getMessage(context, target, action, "success"),
      failure: this.getMessage(context, target, action, "failure"),
    };
  }
}

// Type definitions for better type safety and documentation
export type Context = "bot" | "user";
export type Target = "self" | "others";
export type Action =
  | "ban"
  | "unban"
  | "kick"
  | "mute"
  | "timeout"
  | "warn"
  | "promote"
  | "demote"
  | "role"
  | "nickname";
export type MessageType = "success" | "failure";

interface ActionMessages {
  success: string[];
  failure: string[];
}

interface TargetData {
  [action: string]: ActionMessages;
}

interface ContextData {
  self: TargetData;
  others: TargetData;
}

interface JokeData {
  user: ContextData;
  bot: ContextData;
}
