import type { Command } from "@/types";
import { sendError } from "@/utils/error";
import { sanitise } from "@/utils/sanitise";
import {
  ContainerBuilder,
  Interaction,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";

export class CalculateCommand implements Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder =
    new SlashCommandBuilder()
      .setName("calculate")
      .setDescription("Calculate some super difficult maths!")
      .setContexts(
        InteractionContextType.BotDM,
        InteractionContextType.Guild,
        InteractionContextType.PrivateChannel
      )
      .addStringOption((option) =>
        option
          .setName("eq")
          .setDescription("The equation to calculate!")
          .setRequired(true)
      );

  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;
    const equation: string = interaction.options.getString("eq") as string;

    let safeEq: string;

    try {
      safeEq = await sanitise(equation);
    } catch (error) {
      return await sendError(interaction, error as Error);
    }
    const result: number = eval(safeEq);

    if (result) {
      const resultContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent("## 🧮 Calculation Result")
        )
        .addTextDisplayComponents((text) =>
          text.setContent(`**Equation:** \`${equation}\``)
        )
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((text) =>
          text.setContent(`**Result:** \`${result}\``)
        )
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((text) =>
          text.setContent(`**Safe Expression:** \`${safeEq}\``)
        );

      await interaction.reply({
        components: [resultContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } else {
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent("## ❌ Calculation Error")
        )
        .addTextDisplayComponents((text) =>
          text.setContent(`**Equation:** \`${equation}\``)
        )
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((text) =>
          text.setContent("**Error:** Invalid calculation result")
        );

      await interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  }
}
