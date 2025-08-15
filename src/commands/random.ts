import type { Command } from "@/types";
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

export class RandomCommand implements Command {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder = new SlashCommandBuilder()
    .setName("random")
    .setDescription("Generate random numbers or make random choices")
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
        .setName("number")
        .setDescription("Generate a random number within a range")
        .addIntegerOption((option) =>
          option
            .setName("min")
            .setDescription("Minimum number (default: 1)")
            .setRequired(false)
        )
        .addIntegerOption((option) =>
          option
            .setName("max")
            .setDescription("Maximum number (default: 100)")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("choice")
        .setDescription("Make a random choice from a list of options")
        .addStringOption((option) =>
          option
            .setName("options")
            .setDescription(
              "Options separated by commas (e.g., 'apple, banana, orange')"
            )
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("coinflip").setDescription("Flip a coin")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("dice")
        .setDescription("Roll dice")
        .addIntegerOption((option) =>
          option
            .setName("sides")
            .setDescription("Number of sides on the dice (default: 6)")
            .setRequired(false)
            .setMinValue(2)
            .setMaxValue(100)
        )
        .addIntegerOption((option) =>
          option
            .setName("count")
            .setDescription("Number of dice to roll (default: 1)")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(10)
        )
    );

  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "number":
        await this.handleNumber(interaction);
        break;
      case "choice":
        await this.handleChoice(interaction);
        break;
      case "coinflip":
        await this.handleCoinflip(interaction);
        break;
      case "dice":
        await this.handleDice(interaction);
        break;
    }
  }

  private async handleNumber(interaction: any): Promise<void> {
    const min = interaction.options.getInteger("min") || 1;
    const max = interaction.options.getInteger("max") || 100;

    if (min > max) {
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent("## ❌ Invalid Range")
        )
        .addTextDisplayComponents((text) =>
          text.setContent(
            "**Error:** Minimum value cannot be greater than maximum value"
          )
        );

      await interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const result = Math.floor(Math.random() * (max - min + 1)) + min;

    const numberContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent("## 🎲 Random Number")
      )
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**Range:** ${min.toLocaleString()} - ${max.toLocaleString()}`
        )
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Result:** **${result.toLocaleString()}**`)
      );

    await interaction.reply({
      components: [numberContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  private async handleChoice(interaction: any): Promise<void> {
    const optionsString = interaction.options.getString("options");
    const options = optionsString
      .split(",")
      .map((option: string) => option.trim())
      .filter((option: string) => option.length > 0);

    if (options.length < 2) {
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent("## ❌ Invalid Options")
        )
        .addTextDisplayComponents((text) =>
          text.setContent(
            "**Error:** Please provide at least 2 options separated by commas"
          )
        );

      await interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const choice = options[Math.floor(Math.random() * options.length)];

    const choiceContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent("## 🎯 Random Choice")
      )
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**Options:** ${options.slice(0, 5).join(", ")}${
            options.length > 5 ? "..." : ""
          }`
        )
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Choice:** **${choice}**`)
      );

    await interaction.reply({
      components: [choiceContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  private async handleCoinflip(interaction: any): Promise<void> {
    const result = Math.random() < 0.5 ? "Heads" : "Tails";
    const emoji = result === "Heads" ? "🪙" : "⚫";

    const coinContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent("## 🪙 Coin Flip"))
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(`**Result:** ${emoji} **${result}**`)
      );

    await interaction.reply({
      components: [coinContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  private async handleDice(interaction: any): Promise<void> {
    const sides = interaction.options.getInteger("sides") || 6;
    const count = interaction.options.getInteger("count") || 1;

    const results: number[] = [];
    for (let i = 0; i < count; i++) {
      results.push(Math.floor(Math.random() * sides) + 1);
    }

    const total = results.reduce((sum, roll) => sum + roll, 0);
    const resultString =
      results.length === 1 ? (results[0] || 0).toString() : results.join(", ");

    const diceContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent("## 🎲 Dice Roll"))
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(`**Dice:** ${count}d${sides}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Results:** ${resultString}`)
      );

    if (results.length > 1) {
      diceContainer.addTextDisplayComponents((text) =>
        text.setContent(`**Total:** **${total}**`)
      );
    }

    await interaction.reply({
      components: [diceContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}

export default RandomCommand;
