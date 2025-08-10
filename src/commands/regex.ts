import type { Command } from "@/types";
import {
  Interaction,
  SlashCommandBuilder,
  ContainerBuilder,
  MessageFlags,
  InteractionContextType,
  ApplicationIntegrationType,
  TextDisplayBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";

export class RegexCommand implements Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder =
    new SlashCommandBuilder()
      .setName("regex")
      .setDescription("We'll test your regex!")
      .setContexts(
        InteractionContextType.BotDM,
        InteractionContextType.Guild,
        InteractionContextType.PrivateChannel
      )
      .setIntegrationTypes(
        ApplicationIntegrationType.GuildInstall,
        ApplicationIntegrationType.UserInstall
      )
      .addStringOption((opt) =>
        opt
          .setName("regex")
          .setDescription("The regex you want to test")
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("test")
          .setDescription("The text you want to try")
          .setRequired(true)
      );

  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    await interaction.reply({
      components: [
        new TextDisplayBuilder().setContent("Quickly testing this regex..."),
      ],
      flags: MessageFlags.IsComponentsV2,
    });

    const options = interaction.options;
    const regex = options.getString("regex")!;
    const test = options.getString("test")!;

    let passed = false;
    let error: Error | null = null;

    try {
      passed = new RegExp(regex).test(test);
    } catch (e: unknown) {
      if (e instanceof Error) error = e;
      else error = new Error(String(e));
    }

    const container = new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent(`## Regex Tester`))
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(`Your Regex: \`\`\`${regex}\`\`\``)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`Your Test Text: \`\`\`${test}\`\`\``)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`Did it pass: \`\`\`${passed}\`\`\``)
      );

    if (error) {
      container.addTextDisplayComponents((text) =>
        text.setContent(`Error: \`\`\`${error.message}\`\`\``)
      );
    }

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}

export default RegexCommand;
