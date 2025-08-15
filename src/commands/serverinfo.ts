import type { Command } from "@/types";
import {
  ApplicationIntegrationType,
  ContainerBuilder,
  Guild,
  Interaction,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";

export class ServerinfoCommand implements Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder =
    new SlashCommandBuilder()
      .setName("serverinfo")
      .setDescription("Display detailed information about the current server")
      .setContexts(InteractionContextType.Guild)
      .setIntegrationTypes(ApplicationIntegrationType.GuildInstall);

  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand() || !interaction.guild) return;

    const guild: Guild = interaction.guild;

    // Fetch additional guild data
    const owner = await guild.fetchOwner().catch(() => null);
    const channels = guild.channels.cache;
    const textChannels = channels.filter((c) => c.type === 0).size; // Text channels
    const voiceChannels = channels.filter((c) => c.type === 2).size; // Voice channels
    const categories = channels.filter((c) => c.type === 4).size; // Categories

    const serverContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent(`## ${guild.name}`))
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(`**Server ID:** \`${guild.id}\``)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**Owner:** ${owner ? owner.user.displayName : "Unknown"}`
        )
      )
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`
        )
      )
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**Server Age:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>`
        )
      )
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(`**Members:** ${guild.memberCount.toLocaleString()}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Roles:** ${guild.roles.cache.size.toLocaleString()}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**Emojis:** ${guild.emojis.cache.size.toLocaleString()}`
        )
      )
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**Stickers:** ${guild.stickers.cache.size.toLocaleString()}`
        )
      )
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(`**Text Channels:** ${textChannels.toLocaleString()}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Voice Channels:** ${voiceChannels.toLocaleString()}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Categories:** ${categories.toLocaleString()}`)
      );

    // Add boost information
    if (guild.premiumSubscriptionCount && guild.premiumSubscriptionCount > 0) {
      serverContainer
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((text) =>
          text.setContent(`**Boost Level:** ${guild.premiumTier}/3`)
        )
        .addTextDisplayComponents((text) =>
          text.setContent(
            `**Boosts:** ${(
              guild.premiumSubscriptionCount || 0
            ).toLocaleString()}`
          )
        );
    }

    // Add verification level
    const verificationLevels = {
      0: "None",
      1: "Low",
      2: "Medium",
      3: "High",
      4: "Very High",
    };

    serverContainer
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**Verification Level:** ${
            verificationLevels[guild.verificationLevel]
          }`
        )
      );

    // Add features if any
    if (guild.features.length > 0) {
      const features = guild.features
        .map((feature) =>
          feature.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
        )
        .slice(0, 5)
        .join(", ");

      serverContainer.addTextDisplayComponents((text) =>
        text.setContent(
          `**Features:** ${features}${guild.features.length > 5 ? "..." : ""}`
        )
      );
    }

    await interaction.reply({
      components: [serverContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}

export default ServerinfoCommand;
