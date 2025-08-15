import type { Command } from "@/types";
import {
  ApplicationIntegrationType,
  ContainerBuilder,
  Interaction,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";

export class QrcodeCommand implements Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder =
    new SlashCommandBuilder()
      .setName("qrcode")
      .setDescription("Generate a QR code from text")
      .setContexts(
        InteractionContextType.BotDM,
        InteractionContextType.Guild,
        InteractionContextType.PrivateChannel
      )
      .setIntegrationTypes(
        ApplicationIntegrationType.GuildInstall,
        ApplicationIntegrationType.UserInstall
      )
      .addStringOption((option) =>
        option
          .setName("text")
          .setDescription("The text to encode in the QR code")
          .setRequired(true)
          .setMaxLength(1000)
      )
      .addIntegerOption((option) =>
        option
          .setName("size")
          .setDescription("Size of the QR code (default: 200)")
          .setMinValue(100)
          .setMaxValue(500)
          .setRequired(false)
      );

  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const text = interaction.options.getString("text", true);
    const size = interaction.options.getInteger("size") || 200;

    // Using qr-server.com API for QR code generation
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
      text
    )}&format=png`;

    const qrContainer = new ContainerBuilder()
      .addTextDisplayComponents((textComponent) =>
        textComponent.setContent(`## 📱 QR Code Generated`)
      )
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((textComponent) =>
        textComponent.setContent(
          `**Text:** ${
            text.length > 100 ? text.substring(0, 100) + "..." : text
          }`
        )
      )
      .addTextDisplayComponents((textComponent) =>
        textComponent.setContent(`**Size:** ${size}x${size} pixels`)
      )
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((textComponent) =>
        textComponent.setContent(`**[Download QR Code](${qrUrl})**`)
      );

    await interaction.reply({
      components: [qrContainer],
      flags: MessageFlags.IsComponentsV2,
      files: [
        {
          attachment: qrUrl,
          name: `qrcode_${Date.now()}.png`,
        },
      ],
    });
  }
}

export default QrcodeCommand;
