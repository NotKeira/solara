import type { Command } from "@/types";
import { sendError } from "@/utils/error";
import {
  ApplicationIntegrationType,
  ContainerBuilder,
  Interaction,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export class Base64Command implements Command {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder = new SlashCommandBuilder()
    .setName("base64")
    .setDescription("Encode or decode base64 strings")
    .setContexts(
      InteractionContextType.BotDM,
      InteractionContextType.Guild,
      InteractionContextType.PrivateChannel
    )
    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("encode")
        .setDescription("Encode text to base64")
        .addStringOption((option) =>
          option
            .setName("text")
            .setDescription("The text to encode")
            .setRequired(true)
            .setMaxLength(1000)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("decode")
        .setDescription("Decode base64 to text")
        .addStringOption(
          (option) =>
            option
              .setName("base64")
              .setDescription("The base64 string to decode")
              .setRequired(true)
              .setMaxLength(1400) // Base64 is ~33% larger than original
        )
    );

  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "encode":
        await this.handleEncode(interaction);
        break;
      case "decode":
        await this.handleDecode(interaction);
        break;
    }
  }

  private async handleEncode(interaction: any): Promise<void> {
    const inputText = interaction.options.getString("text");

    try {
      const encoded = Buffer.from(inputText, "utf8").toString("base64");

      const encodeContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent("## 🔐 Base64 Encode")
        )
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((text) =>
          text.setContent(
            `**Original Text:** \`${inputText.substring(0, 100)}${
              inputText.length > 100 ? "..." : ""
            }\``
          )
        )
        .addTextDisplayComponents((text) =>
          text.setContent(
            `**Encoded:** \`${encoded.substring(0, 100)}${
              encoded.length > 100 ? "..." : ""
            }\``
          )
        )
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((text) =>
          text.setContent(
            `**Size:** ${inputText.length} chars → ${encoded.length} chars`
          )
        );

      await interaction.reply({
        components: [encodeContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      return await sendError(interaction, error as Error);
    }
  }

  private async handleDecode(interaction: any): Promise<void> {
    const base64String = interaction.options.getString("base64");

    try {
      // Validate base64 format
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64String)) {
        throw new Error("Invalid base64 format");
      }

      const decoded = Buffer.from(base64String, "base64").toString("utf8");

      const decodeContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent("## 🔓 Base64 Decode")
        )
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((text) =>
          text.setContent(
            `**Base64:** \`${base64String.substring(0, 100)}${
              base64String.length > 100 ? "..." : ""
            }\``
          )
        )
        .addTextDisplayComponents((text) =>
          text.setContent(
            `**Decoded Text:** \`${decoded.substring(0, 100)}${
              decoded.length > 100 ? "..." : ""
            }\``
          )
        )
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((text) =>
          text.setContent(
            `**Size:** ${base64String.length} chars → ${decoded.length} chars`
          )
        );

      await interaction.reply({
        components: [decodeContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Invalid base64 string or unable to decode to valid UTF-8 text";
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent("## ❌ Decode Error")
        )
        .addTextDisplayComponents((text) =>
          text.setContent(`**Error:** ${errorMessage}`)
        );

      await interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }
  }
}

export default Base64Command;
