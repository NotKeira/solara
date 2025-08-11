import type { Command } from "@/types";
import {
  ApplicationIntegrationType,
  ContainerBuilder,
  Interaction,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";
import {
  getDetailedMemoryUsage,
  forceGarbageCollection,
} from "@/utils/memory-profiler";

export class MemoryCommand implements Command {
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName("memory")
    .setDescription("Display detailed memory usage information")
    .addBooleanOption((option) =>
      option
        .setName("gc")
        .setDescription("Force garbage collection before showing memory")
        .setRequired(false)
    )
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ])
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ]);

  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const shouldGC = interaction.options.getBoolean("gc") ?? false;

    let gcInfo = "";
    if (shouldGC) {
      const freed = forceGarbageCollection();
      if (freed) {
        gcInfo = `**GC Freed:** ${freed.heapUsed}MB heap, ${freed.rss}MB RSS\n`;
      } else {
        gcInfo = "**GC:** Not available (use --expose-gc flag)\n";
      }
    }

    const usage = getDetailedMemoryUsage();

    const memoryContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent("## 🧠 Memory Usage Analysis")
      )
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(`**RSS (Physical Memory):** ${usage.rss}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Heap Total:** ${usage.heapTotal}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Heap Used:** ${usage.heapUsed}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Heap Free:** ${usage.heapFree}`)
      )
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(`**External (C++ Objects):** ${usage.external}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**ArrayBuffers:** ${usage.arrayBuffers}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Non-Heap Memory:** ${usage.nonHeapMemory}`)
      );

    if (gcInfo) {
      memoryContainer
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((text) => text.setContent(gcInfo.trim()));
    }

    await interaction.reply({
      components: [memoryContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}

export default MemoryCommand;
