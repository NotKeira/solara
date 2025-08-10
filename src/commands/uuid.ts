import type { Command } from "@/types";
import { UUID } from "@/utils/uuid";
import {
  Interaction,
  SlashCommandBuilder,
  ContainerBuilder,
  MessageFlags,
  InteractionContextType,
  ApplicationIntegrationType,
  TextDisplayBuilder,
} from "discord.js";

export class UUIDCommand implements Command {
  data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName("uuid")
    .setDescription("Generate a UUID")
    .setContexts(
      InteractionContextType.BotDM,
      InteractionContextType.Guild,
      InteractionContextType.PrivateChannel
    )
    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    );

  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isCommand()) return;
    await interaction.reply({
      components: [new TextDisplayBuilder().setContent("Generating a UUID...")],
      flags: MessageFlags.IsComponentsV2,
    });

    const uuid: string = await UUID.uuidv4();

    const container: ContainerBuilder = new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent(`## UUID Generator`))
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(`Your UUID: \`\`\`${uuid}\`\`\``)
      );
    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}

export default UUIDCommand;
