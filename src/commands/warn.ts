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
import { moderationCases } from "@/database/schema";
import { generateUniqueCaseId } from "@/utils/case-management";
import { ensureGuildExists, storeUser } from "@/utils/moderation";

export class WarnCommand implements Command {
  data = new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Issue a warning to a member")
    .setContexts(InteractionContextType.Guild)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("The member to warn")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the warning")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("silent")
        .setDescription("Don't DM the user about this warning")
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
    const reason = interaction.options.getString("reason", true);
    const silent = interaction.options.getBoolean("silent") ?? false;

    try {
      // Check if user is trying to warn themselves
      if (targetUser.id === interaction.user.id) {
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents((text) =>
            text.setContent("## ❌ Cannot Warn Yourself")
          )
          .addSeparatorComponents((sep) => sep.setDivider(true))
          .addTextDisplayComponents((text) =>
            text.setContent("You cannot warn yourself.")
          );

        await interaction.reply({
          components: [errorContainer],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
        return;
      }

      const { id: caseUuid, caseId } = await generateUniqueCaseId();

      // Ensure guild exists in database before creating case
      await ensureGuildExists(
        interaction.guild.id,
        interaction.guild.name,
        interaction.guild.ownerId
      );

      // Try to DM the user if not silent
      let userContacted = false;
      if (!silent) {
        try {
          const dmContainer = new ContainerBuilder()
            .addTextDisplayComponents((text) =>
              text.setContent(
                `## ⚠️ You have received a warning in ${
                  interaction.guild!.name
                }`
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

          await targetUser.send({
            components: [dmContainer],
            flags: MessageFlags.IsComponentsV2,
          });
          userContacted = true;
        } catch (error: unknown) {
          if (error instanceof DiscordAPIError && error.code === 50007) {
            userContacted = false;
          }
        }
      }

      // Store user and moderator in database
      await storeUser(targetUser);
      await storeUser(interaction.user);

      // Create moderation case
      await Database.insert(moderationCases).values({
        id: caseUuid,
        caseId: caseId,
        guildId: interaction.guild.id,
        type: "warn",
        userId: targetUser.id,
        moderatorId: interaction.user.id,
        reason: reason,
        evidence: [],
        attachments: [],
      });

      // Success response
      const resultContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent("## ✅ Warning Issued Successfully")
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
          text.setContent(`**Reason:** ${reason}`)
        );

      if (!silent) {
        resultContainer
          .addSeparatorComponents((sep) => sep.setDivider(true))
          .addTextDisplayComponents((text) =>
            text.setContent(
              `**User Contacted:** ${
                userContacted ? "Yes" : "No (DMs disabled)"
              }`
            )
          );
      }

      await interaction.reply({
        components: [resultContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      console.error("Error issuing warning:", error);

      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent("## ❌ Warning Failed")
        )
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((text) =>
          text.setContent(
            "An error occurred while trying to issue the warning."
          )
        );

      await interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    }
  }
}

export default WarnCommand;
