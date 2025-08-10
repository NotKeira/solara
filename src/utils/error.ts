import { Interaction, ContainerBuilder, MessageFlags } from "discord.js";

export async function sendError(
  interaction: Interaction,
  error: Error
): Promise<void> {
  if (!interaction.isRepliable()) return;

  const errorContainer = new ContainerBuilder()
    .addTextDisplayComponents((text) =>
      text.setContent(`## ❌ An Error Occurred`)
    )
    .addSeparatorComponents((separator) => separator.setDivider(true))
    .addTextDisplayComponents((text) =>
      text.setContent(`**${error.message}**`)
    );
  await interaction.reply({
    components: [errorContainer],
    flags: MessageFlags.IsComponentsV2,
  });
}
