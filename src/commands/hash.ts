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
import { createHash } from "crypto";

export class HashCommand implements Command {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder = new SlashCommandBuilder()
    .setName("hash")
    .setDescription("Generate cryptographic hashes from text")
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
        .setDescription("The text to hash")
        .setRequired(true)
        .setMaxLength(1000)
    )
    .addStringOption((option) =>
      option
        .setName("algorithm")
        .setDescription("The hash algorithm to use")
        .setRequired(false)
        .addChoices(
          { name: "MD5", value: "md5" },
          { name: "SHA1", value: "sha1" },
          { name: "SHA256", value: "sha256" },
          { name: "SHA512", value: "sha512" }
        )
    );

  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const text = interaction.options.getString("text")!;
    const algorithm = interaction.options.getString("algorithm") || "sha256";

    try {
      const hash = createHash(algorithm).update(text, "utf8").digest("hex");

      const hashContainer = new ContainerBuilder()
        .addTextDisplayComponents((component) =>
          component.setContent("## 🔐 Hash Generator")
        )
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((component) =>
          component.setContent(`**Algorithm:** ${algorithm.toUpperCase()}`)
        )
        .addTextDisplayComponents((component) =>
          component.setContent(
            `**Input:** \`${text.substring(0, 100)}${
              text.length > 100 ? "..." : ""
            }\``
          )
        )
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((component) =>
          component.setContent(`**Hash:** \`${hash}\``)
        )
        .addTextDisplayComponents((component) =>
          component.setContent(`**Length:** ${hash.length} characters`)
        );

      await interaction.reply({
        components: [hashContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      return await sendError(interaction, error as Error);
    }
  }
}

export default HashCommand;
