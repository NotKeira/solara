import type { Command } from "@/types";
import {
  ApplicationIntegrationType,
  ContainerBuilder,
  Interaction,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  User,
} from "discord.js";

export class AvatarCommand implements Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder =
    new SlashCommandBuilder()
      .setName("avatar")
      .setDescription("Display a user's avatar")
      .setContexts(
        InteractionContextType.BotDM,
        InteractionContextType.Guild,
        InteractionContextType.PrivateChannel
      )
      .setIntegrationTypes(
        ApplicationIntegrationType.GuildInstall,
        ApplicationIntegrationType.UserInstall
      )
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user whose avatar you want to see")
          .setRequired(false)
      );

  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const targetUser: User =
      interaction.options.getUser("user") || interaction.user;
    const member = interaction.guild?.members.cache.get(targetUser.id);

    const globalAvatar = targetUser.displayAvatarURL({
      size: 4096,
      extension: "png",
    });
    const serverAvatar = member?.displayAvatarURL({
      size: 4096,
      extension: "png",
    });

    const avatarContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(`## 🖼️ ${targetUser.displayName}'s Avatar`)
      )
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(`**Username:** ${targetUser.username}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Display Name:** ${targetUser.displayName}`)
      );

    // Add server-specific avatar info if different from global
    if (serverAvatar && serverAvatar !== globalAvatar) {
      avatarContainer
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((text) =>
          text.setContent("**Note:** This user has a server-specific avatar")
        );
    }

    avatarContainer
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**[Download Avatar](${serverAvatar || globalAvatar})**`
        )
      );

    await interaction.reply({
      components: [avatarContainer],
      flags: MessageFlags.IsComponentsV2,
      files: [
        {
          attachment: serverAvatar || globalAvatar,
          name: `${targetUser.username}_avatar.png`,
        },
      ],
    });
  }
}

export default AvatarCommand;
