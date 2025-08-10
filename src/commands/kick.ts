import { Command } from "@/types";
import {
  SlashCommandBuilder,
  Interaction,
  PermissionFlagsBits,
  MessageFlags,
  DiscordAPIError,
  ContainerBuilder,
  InteractionContextType,
} from "discord.js";
export class KickCommand implements Command {
  data = new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server")
    .setContexts(InteractionContextType.Guild)
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("The member to kick")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the kick")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

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
    const reason =
      interaction.options.getString("reason") ?? "No reason provided";

    try {
      const member = await interaction.guild.members.fetch(targetUser.id);

      if (!member.kickable) {
        await interaction.reply({
          content:
            "I cannot kick this member. They may have higher permissions than me.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Try to DM the user before kicking
      let userContacted: boolean = false;

      try {
        const dmContainer = new ContainerBuilder()
          .addTextDisplayComponents((text) =>
            text.setContent(
              `## ⚠️ You have been kicked from ${interaction.guild!.name}`
            )
          )
          .addSeparatorComponents((sep) => sep.setDivider(true))
          .addTextDisplayComponents((text) =>
            text.setContent(`**Reason:** ${reason}`)
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

      await member.kick(reason);

      const resultContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent("## Member Kicked Successfully")
        )
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((text) =>
          text.setContent(
            `**Member:** ${targetUser.username} (${targetUser.id})`
          )
        )
        .addTextDisplayComponents((text) =>
          text.setContent(`**Moderator:** ${interaction.user.username}`)
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
      console.error("Error kicking member:", error);

      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) => text.setContent("## Kick Failed"))
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((text) =>
          text.setContent("An error occurred while trying to kick the member.")
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
}

export default KickCommand;
