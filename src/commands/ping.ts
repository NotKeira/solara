import type { Command, ExtendedClient } from "@/types";
import { createProgressBar } from "@/utils";
import {
  Interaction,
  SlashCommandBuilder,
  ContainerBuilder,
  MessageFlags,
  InteractionContextType,
  ApplicationIntegrationType,
} from "discord.js";
import { memoryUsage } from "process";
import { version } from "@/../package.json";

export class PingCommand implements Command {
  data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with my information")
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
    const client: ExtendedClient = interaction.client as ExtendedClient;
    if (!interaction.isCommand()) return;

    // Measure just the deferReply time for true API latency
    const deferStart = performance.now();
    await interaction.deferReply();
    const deferTime = (performance.now() - deferStart).toFixed(2);

    // Get data and pre-calculate with optimised operations
    const memory = memoryUsage();
    const gatewayPing = client.ws.ping;
    const heapLimitBytes = 1073741824; // 1024MB in bytes
    const heapLimitMB = 1024;
    const mb = 1048576;
    const heapUsedMB = memory.heapUsed / mb;
    const heapTotalMB = memory.heapTotal / mb;
    const rssMB = memory.rss / mb;
    const externalMB = memory.external / mb;
    const heapPercentage = (memory.heapUsed / heapLimitBytes) * 100;
    const progressBars = createProgressBar(heapPercentage);

    // Pre-build container
    const statsContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(`## 📊 Elara Stats | v${version || "1.0.0"}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Heap Memory:** ${progressBars}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**Heap Usage:** ${heapPercentage.toFixed(1)}% (${heapUsedMB.toFixed(
            2
          )}MB / ${heapLimitMB}MB limit)`
        )
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Heap Allocated:** ${heapTotalMB.toFixed(2)}MB`)
      )
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(`**Total RSS:** ${rssMB.toFixed(2)}MB`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**External:** ${externalMB.toFixed(2)}MB`)
      )
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(`**Initial Response:** ${deferTime}ms`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**Gateway Latency:** ${gatewayPing >= 0 ? gatewayPing : "N/A"}ms`
        )
      );

    // Now measure editReply time separately
    const editStart = performance.now();
    await interaction.editReply({
      components: [statsContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    const editTime = (performance.now() - editStart).toFixed(2);

    // Update with edit timing (this will show the true API call times)
    const finalContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(`## 📊 Elara Stats | v${version || "1.0.0"}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Heap Memory:** ${progressBars}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**Heap Usage:** ${heapPercentage.toFixed(1)}% (${heapUsedMB.toFixed(
            2
          )}MB / ${heapLimitMB}MB limit)`
        )
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Heap Allocated:** ${heapTotalMB.toFixed(2)}MB`)
      )
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(`**Total RSS:** ${rssMB.toFixed(2)}MB`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**External:** ${externalMB.toFixed(2)}MB`)
      )
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(`**Defer Time:** ${deferTime}ms`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Edit Time:** ${editTime}ms`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**Gateway Latency:** ${gatewayPing >= 0 ? gatewayPing : "N/A"}ms`
        )
      );

    await interaction.editReply({
      components: [finalContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}

export default PingCommand;
