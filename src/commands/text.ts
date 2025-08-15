import type { Command } from "@/types";
import {
  ApplicationIntegrationType,
  ContainerBuilder,
  Interaction,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export class TextCommand implements Command {
  data: SlashCommandSubcommandsOnlyBuilder = new SlashCommandBuilder()
    .setName("text")
    .setDescription("Manipulate text in various ways")
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
        .setName("reverse")
        .setDescription("Reverse the given text")
        .addStringOption((option) =>
          option
            .setName("text")
            .setDescription("The text to reverse")
            .setRequired(true)
            .setMaxLength(1000)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("uppercase")
        .setDescription("Convert text to uppercase")
        .addStringOption((option) =>
          option
            .setName("text")
            .setDescription("The text to convert to uppercase")
            .setRequired(true)
            .setMaxLength(1000)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("lowercase")
        .setDescription("Convert text to lowercase")
        .addStringOption((option) =>
          option
            .setName("text")
            .setDescription("The text to convert to lowercase")
            .setRequired(true)
            .setMaxLength(1000)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("count")
        .setDescription("Count characters, words, and lines in text")
        .addStringOption((option) =>
          option
            .setName("text")
            .setDescription("The text to analyze")
            .setRequired(true)
            .setMaxLength(2000)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("replace")
        .setDescription("Replace occurrences of text")
        .addStringOption((option) =>
          option
            .setName("text")
            .setDescription("The original text")
            .setRequired(true)
            .setMaxLength(1000)
        )
        .addStringOption((option) =>
          option
            .setName("find")
            .setDescription("The text to find")
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption((option) =>
          option
            .setName("replace")
            .setDescription("The replacement text")
            .setRequired(true)
            .setMaxLength(100)
        )
    );

  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const subcommand = interaction.options.getSubcommand();
    const text = interaction.options.getString("text", true);

    let result: string;
    let operation: string;
    let additionalInfo = "";

    switch (subcommand) {
      case "reverse": {
        result = text.split("").reverse().join("");
        operation = "Reversed Text";
        break;
      }

      case "uppercase": {
        result = text.toUpperCase();
        operation = "Uppercase Text";
        break;
      }

      case "lowercase": {
        result = text.toLowerCase();
        operation = "Lowercase Text";
        break;
      }

      case "count": {
        const charCount = text.length;
        const wordCount = text
          .trim()
          .split(/\s+/)
          .filter((word) => word.length > 0).length;
        const lineCount = text.split("\n").length;
        const noSpaceCount = text.replace(/\s/g, "").length;

        result = text;
        operation = "Text Analysis";
        additionalInfo = `**Characters:** ${charCount}\n**Characters (no spaces):** ${noSpaceCount}\n**Words:** ${wordCount}\n**Lines:** ${lineCount}`;
        break;
      }

      case "replace": {
        const findText = interaction.options.getString("find", true);
        const replaceText = interaction.options.getString("replace", true);
        result = text.replaceAll(findText, replaceText);

        // Count replacements using a safer method
        const escapedFind = findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escapedFind, "g");
        const matches = [...text.matchAll(regex)];
        const replacements = matches.length;

        operation = "Text Replacement";
        additionalInfo = `**Find:** "${findText}"\n**Replace:** "${replaceText}"\n**Replacements made:** ${replacements}`;
        break;
      }

      default:
        await interaction.reply({
          content: "Unknown subcommand!",
          ephemeral: true,
        });
        return;
    }

    const textContainer = new ContainerBuilder().addTextDisplayComponents(
      (textComponent) => textComponent.setContent(`## 📝 ${operation}`)
    );

    if (additionalInfo) {
      textContainer
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((textComponent) =>
          textComponent.setContent(additionalInfo)
        );
    }

    textContainer
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((textComponent) =>
        textComponent.setContent(
          `**Original:** ${
            text.length > 500 ? text.substring(0, 500) + "..." : text
          }`
        )
      );

    if (subcommand !== "count") {
      textContainer.addTextDisplayComponents((textComponent) =>
        textComponent.setContent(
          `**Result:** ${
            result.length > 500 ? result.substring(0, 500) + "..." : result
          }`
        )
      );
    }

    await interaction.reply({
      components: [textContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}

export default TextCommand;
