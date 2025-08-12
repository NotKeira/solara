import { Command } from "@/types";
import {
  SlashCommandBuilder,
  Interaction,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  MessageFlags,
  DiscordAPIError,
  ContainerBuilder,
  InteractionContextType,
  ApplicationIntegrationType,
  GuildMember,
} from "discord.js";
import { Database } from "@/database";
import { moderationCases, users, guilds } from "@/database/schema";
import { generateUniqueCaseId } from "@/utils/case-management";

export class BanCommand implements Command {
  data = new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user from the server")
    .setContexts(InteractionContextType.Guild)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to ban").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the ban")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("delete_days")
        .setDescription("Number of days of messages to delete (0-7)")
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription("Ban duration (e.g., 1d, 1w, 1m, permanent)")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    if (!interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetUser = interaction.options.getUser("user", true);
    const reason =
      interaction.options.getString("reason") ?? "No reason provided";
    const deleteDays = interaction.options.getInteger("delete_days") ?? 0;
    const durationString = interaction.options.getString("duration");

    try {
      // Validate ban request
      const validationResult = await this.validateBanRequest(
        interaction,
        targetUser,
        durationString
      );
      if (!validationResult.isValid) {
        await interaction.reply({
          components: [validationResult.errorContainer!],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Execute the ban
      await this.executeBan(
        interaction,
        targetUser,
        reason,
        deleteDays,
        validationResult.duration ?? null,
        validationResult.expiresAt ?? null,
        validationResult.member ?? null
      );
    } catch (error) {
      console.error("Error banning user:", error);
      await this.sendErrorResponse(interaction);
    }
  }

  private async validateBanRequest(
    interaction: Interaction,
    targetUser: any,
    durationString: string | null
  ): Promise<{
    isValid: boolean;
    errorContainer?: ContainerBuilder;
    member?: GuildMember | null;
    duration?: number | null;
    expiresAt?: Date | null;
  }> {
    // Check if user is trying to ban themselves
    if (targetUser.id === interaction.user.id) {
      return {
        isValid: false,
        errorContainer: new ContainerBuilder()
          .addTextDisplayComponents((text) =>
            text.setContent("## ❌ Cannot Ban Yourself")
          )
          .addSeparatorComponents((sep) => sep.setDivider(true))
          .addTextDisplayComponents((text) =>
            text.setContent("You cannot ban yourself from the server.")
          ),
      };
    }

    // Check if user is trying to ban the bot
    if (targetUser.id === interaction.client.user?.id) {
      return {
        isValid: false,
        errorContainer: new ContainerBuilder()
          .addTextDisplayComponents((text) =>
            text.setContent("## ❌ Cannot Ban Bot")
          )
          .addSeparatorComponents((sep) => sep.setDivider(true))
          .addTextDisplayComponents((text) =>
            text.setContent("I cannot ban myself from the server.")
          ),
      };
    }

    // Try to get member
    let member: GuildMember | null = null;
    try {
      member = await interaction.guild!.members.fetch(targetUser.id);
    } catch {
      // User is not in the server, that's fine for banning
    }

    // Check if member can be banned
    if (member && !member.bannable) {
      return {
        isValid: false,
        errorContainer: new ContainerBuilder()
          .addTextDisplayComponents((text) =>
            text.setContent("## ❌ Cannot Ban User")
          )
          .addSeparatorComponents((sep) => sep.setDivider(true))
          .addTextDisplayComponents((text) =>
            text.setContent(
              "I cannot ban this user. They may have higher permissions than me or be the server owner."
            )
          ),
      };
    }

    // Parse duration
    let duration: number | null = null;
    let expiresAt: Date | null = null;
    if (durationString && durationString.toLowerCase() !== "permanent") {
      duration = this.parseDuration(durationString);
      if (duration === null) {
        return {
          isValid: false,
          errorContainer: new ContainerBuilder()
            .addTextDisplayComponents((text) =>
              text.setContent("## ❌ Invalid Duration")
            )
            .addSeparatorComponents((sep) => sep.setDivider(true))
            .addTextDisplayComponents((text) =>
              text.setContent(
                "Invalid duration format. Use formats like: 1d, 1w, 1m, or 'permanent'"
              )
            ),
        };
      }
      expiresAt = new Date(Date.now() + duration);
    }

    return {
      isValid: true,
      member,
      duration,
      expiresAt,
    };
  }

  private async executeBan(
    interaction: Interaction,
    targetUser: any,
    reason: string,
    deleteDays: number,
    duration: number | null,
    expiresAt: Date | null,
    member: GuildMember | null
  ): Promise<void> {
    const { id: caseUuid, caseId } = await generateUniqueCaseId();

    // Try to contact user
    const userContacted = await this.tryContactUser(
      member,
      interaction,
      reason,
      caseId,
      expiresAt
    );

    // Execute the ban
    await interaction.guild!.members.ban(targetUser.id, {
      reason: `${reason} | Case: ${caseId} | Moderator: ${interaction.user.username}`,
      deleteMessageSeconds: deleteDays * 24 * 60 * 60, // Convert days to seconds
    });

    // Ensure guild exists in database
    await this.ensureGuildExists(
      interaction.guild!.id,
      interaction.guild!.name,
      interaction.guild!.ownerId
    );

    // Store data in database
    await this.storeBanData({
      targetUser,
      moderator: interaction.user,
      caseUuid,
      caseId,
      guildId: interaction.guild!.id,
      reason,
      duration,
      expiresAt,
    });

    // Send success response
    await this.sendSuccessResponse(
      interaction as ChatInputCommandInteraction,
      targetUser,
      reason,
      caseId,
      deleteDays,
      expiresAt,
      userContacted
    );
  }

  private async tryContactUser(
    member: GuildMember | null,
    interaction: Interaction,
    reason: string,
    caseId: string,
    expiresAt: Date | null
  ): Promise<boolean> {
    if (!member) return false;

    try {
      const dmContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent(
            `## ⚠️ You have been banned from ${interaction.guild!.name}`
          )
        )
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((text) =>
          text.setContent(`**Case ID:** ${caseId}`)
        )
        .addTextDisplayComponents((text) =>
          text.setContent(`**Reason:** ${reason}`)
        )
        .addTextDisplayComponents((text) =>
          text.setContent(`**Moderator:** ${interaction.user.username}`)
        );

      if (expiresAt) {
        dmContainer.addTextDisplayComponents((text) =>
          text.setContent(`**Duration:** Until ${expiresAt.toLocaleString()}`)
        );
      }

      dmContainer
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((text) =>
          text.setContent(
            "If you believe this was a mistake, please contact the server moderators."
          )
        );

      await member.send({
        components: [dmContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return true;
    } catch (error: unknown) {
      if (error instanceof DiscordAPIError && error.code === 50007) {
        return false;
      }
      return false;
    }
  }

  private async storeBanData(params: {
    targetUser: any;
    moderator: any;
    caseUuid: string;
    caseId: string;
    guildId: string;
    reason: string;
    duration: number | null;
    expiresAt: Date | null;
  }): Promise<void> {
    const {
      targetUser,
      moderator,
      caseUuid,
      caseId,
      guildId,
      reason,
      duration,
      expiresAt,
    } = params;
    // Store target user
    await Database.insert(users)
      .values({
        id: targetUser.id,
        username: targetUser.username,
        discriminator: targetUser.discriminator,
        globalName: targetUser.globalName,
        avatar: targetUser.avatar,
        bot: targetUser.bot,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          username: targetUser.username,
          discriminator: targetUser.discriminator,
          globalName: targetUser.globalName,
          avatar: targetUser.avatar,
          updatedAt: new Date(),
        },
      });

    // Store moderator
    await Database.insert(users)
      .values({
        id: moderator.id,
        username: moderator.username,
        discriminator: moderator.discriminator,
        globalName: moderator.globalName,
        avatar: moderator.avatar,
        bot: moderator.bot,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          username: moderator.username,
          discriminator: moderator.discriminator,
          globalName: moderator.globalName,
          avatar: moderator.avatar,
          updatedAt: new Date(),
        },
      });

    // Create moderation case
    await Database.insert(moderationCases).values({
      id: caseUuid,
      caseId: caseId,
      guildId: guildId,
      type: "ban",
      userId: targetUser.id,
      moderatorId: moderator.id,
      reason: reason,
      duration: duration,
      expiresAt: expiresAt,
      evidence: [],
      attachments: [],
    });
  }

  private async sendSuccessResponse(
    interaction: ChatInputCommandInteraction,
    targetUser: any,
    reason: string,
    caseId: string,
    deleteDays: number,
    expiresAt: Date | null,
    userContacted: boolean
  ): Promise<void> {
    const resultContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent("## ✅ User Banned Successfully")
      )
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(`**Case ID:** ${caseId}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**User:** ${targetUser.username} (${targetUser.id})`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Moderator:** ${interaction.user.username}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Reason:** ${reason}`)
      );

    if (deleteDays > 0) {
      resultContainer.addTextDisplayComponents((text) =>
        text.setContent(`**Messages Deleted:** ${deleteDays} day(s)`)
      );
    }

    if (expiresAt) {
      resultContainer.addTextDisplayComponents((text) =>
        text.setContent(`**Expires:** ${expiresAt.toLocaleString()}`)
      );
    }

    resultContainer
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**User Contacted:** ${
            userContacted ? "Yes" : "No (DMs disabled or not in server)"
          }`
        )
      );

    await interaction.reply({
      components: [resultContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  private async sendErrorResponse(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent("## ❌ Ban Failed"))
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent("An error occurred while trying to ban the user.")
      )
      .addTextDisplayComponents((text) =>
        text.setContent("Please check my permissions and try again.")
      );

    await interaction.reply({
      components: [errorContainer],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  }

  /**
   * Parse duration string into milliseconds
   * Supports: 1d, 1w, 1m, 1y
   */
  private parseDuration(duration: string): number | null {
    const regex = /^(\d+)([dwmy])$/i;
    const match = regex.exec(duration);
    if (!match?.[1] || !match?.[2]) return null;

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case "d":
        return value * 24 * 60 * 60 * 1000; // days
      case "w":
        return value * 7 * 24 * 60 * 60 * 1000; // weeks
      case "m":
        return value * 30 * 24 * 60 * 60 * 1000; // months (30 days)
      case "y":
        return value * 365 * 24 * 60 * 60 * 1000; // years (365 days)
      default:
        return null;
    }
  }

  private async ensureGuildExists(
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
}

export default BanCommand;
