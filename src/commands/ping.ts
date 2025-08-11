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

    const apiLatencyStart = Date.now();
    await interaction.reply({
      components: [
        new ContainerBuilder().addTextDisplayComponents((text) =>
          text.setContent("Calculating latencies...")
        ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
    const memory = memoryUsage();

    const heapLimitMB: number = 1024;
    const heapLimitBytes: number = heapLimitMB * 1024 * 1024;
    const heapUsedMB: number = memory.heapUsed / 1024 / 1024;
    const heapTotalMB: number = memory.heapTotal / 1024 / 1024;
    const rssMB: number = memory.rss / 1024 / 1024; // Resident Set Size - actual physical memory used

    // Calculate percentage based on heap total instead of system memory
    const heapPercentage: number = (memory.heapUsed / heapLimitBytes) * 100;

    const stats = {
      memory,
      heapUsedMB,
      rssMB,
      heapPercentage,
      latencies: {
        api: Date.now() - apiLatencyStart,
        gateway: client.ws.ping,
      },
    };

    const progressBars = createProgressBar(heapPercentage);

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
        text.setContent(
          `**External:** ${(memory.external / 1024 / 1024).toFixed(2)}MB`
        )
      )
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(`**API Latency:** ${stats.latencies.api}ms`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**Gateway Latency:** ${
            stats.latencies.gateway >= 0 ? stats.latencies.gateway : "N/A"
          }ms`
        )
      );

    await interaction.editReply({
      components: [statsContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}

export default PingCommand;
