import { Command } from "@/types";
import {
  SlashCommandBuilder,
  Interaction,
  PermissionFlagsBits,
  MessageFlags,
  DiscordAPIError,
  ContainerBuilder,
  InteractionContextType,
  ApplicationIntegrationType,
} from "discord.js";
import { Database } from "@/database";
import { moderationCases, users } from "@/database/schema";
import { generateUniqueCaseId } from "@/utils/case-management";

export class TimeoutCommand implements Command {
  data = new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member from the server")
    .setContexts(InteractionContextType.Guild)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("The member to timeout")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription("Timeout duration (e.g., 1h, 6h, 1d, 1w)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the timeout")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    if (!interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetUser = interaction.options.getUser("member", true);
    const durationString = interaction.options.getString("duration", true);
    const reason =
      interaction.options.getString("reason") ?? "No reason provided";

    try {
      // Parse duration
      const duration = this.parseDuration(durationString);
      if (duration === null || duration < 60000 || duration > 2419200000) {
        // 1 minute to 28 days
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents((text) =>
            text.setContent("## ❌ Invalid Duration")
          )
          .addSeparatorComponents((sep) => sep.setDivider(true))
          .addTextDisplayComponents((text) =>
            text.setContent(
              "Duration must be between 1 minute and 28 days. Use formats like: 1h, 6h, 1d, 1w"
            )
          );

        await interaction.reply({
          components: [errorContainer],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
        return;
      }

      const member = await interaction.guild.members.fetch(targetUser.id);

      if (!member.moderatable) {
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents((text) =>
            text.setContent("## ❌ Cannot Timeout Member")
          )
          .addSeparatorComponents((sep) => sep.setDivider(true))
          .addTextDisplayComponents((text) =>
            text.setContent(
              "I cannot timeout this member. They may have higher permissions than me."
            )
          );

        await interaction.reply({
          components: [errorContainer],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
        return;
      }

      const expiresAt = new Date(Date.now() + duration);
      const { id: caseUuid, caseId } = await generateUniqueCaseId();

      // Try to DM the user before timing out
      let userContacted = false;
      try {
        const dmContainer = new ContainerBuilder()
          .addTextDisplayComponents((text) =>
            text.setContent(
              `## ⏰ You have been timed out in ${interaction.guild!.name}`
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
            text.setContent(`**Duration:** Until ${expiresAt.toLocaleString()}`)
          )
          .addTextDisplayComponents((text) =>
            text.setContent(`**Moderator:** ${interaction.user.username}`)
          )
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
        userContacted = true;
      } catch (error: unknown) {
        if (error instanceof DiscordAPIError && error.code === 50007) {
          userContacted = false;
        }
      }

      // Execute the timeout
      await member.timeout(
        duration,
        `${reason} | Case: ${caseId} | Moderator: ${interaction.user.username}`
      );

      // Store user and moderator in database
      await this.storeUser(targetUser);
      await this.storeUser(interaction.user);

      // Create moderation case
      await Database.insert(moderationCases).values({
        id: caseUuid,
        caseId: caseId,
        guildId: interaction.guild.id,
        type: "timeout",
        userId: targetUser.id,
        moderatorId: interaction.user.id,
        reason: reason,
        duration: duration,
        expiresAt: expiresAt,
        evidence: [],
        attachments: [],
      });

      // Success response
      const resultContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent("## ✅ Member Timed Out Successfully")
        )
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((text) =>
          text.setContent(`**Case ID:** ${caseId}`)
        )
        .addTextDisplayComponents((text) =>
          text.setContent(
            `**Member:** ${targetUser.username} (${targetUser.id})`
          )
        )
        .addTextDisplayComponents((text) =>
          text.setContent(`**Moderator:** ${interaction.user.username}`)
        )
        .addTextDisplayComponents((text) =>
          text.setContent(`**Duration:** ${this.formatDuration(duration)}`)
        )
        .addTextDisplayComponents((text) =>
          text.setContent(`**Expires:** ${expiresAt.toLocaleString()}`)
        )
        .addTextDisplayComponents((text) =>
          text.setContent(`**Reason:** ${reason}`)
        )
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((text) =>
          text.setContent(
            `**User Contacted:** ${userContacted ? "Yes" : "No (DMs disabled)"}`
          )
        );

      await interaction.reply({
        components: [resultContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      console.error("Error timing out member:", error);

      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent("## ❌ Timeout Failed")
        )
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((text) =>
          text.setContent(
            "An error occurred while trying to timeout the member."
          )
        )
        .addTextDisplayComponents((text) =>
          text.setContent("Please check my permissions and try again.")
        );

      await interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    }
  }

  private async storeUser(user: any): Promise<void> {
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

  private parseDuration(duration: string): number | null {
    const regex = /^(\d+)([smhdw])$/i;
    const match = regex.exec(duration);
    if (!match?.[1] || !match?.[2]) return null;

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case "s":
        return value * 1000; // seconds
      case "m":
        return value * 60 * 1000; // minutes
      case "h":
        return value * 60 * 60 * 1000; // hours
      case "d":
        return value * 24 * 60 * 60 * 1000; // days
      case "w":
        return value * 7 * 24 * 60 * 60 * 1000; // weeks
      default:
        return null;
    }
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
    return `${seconds} second${seconds > 1 ? "s" : ""}`;
  }
}

export default TimeoutCommand;
