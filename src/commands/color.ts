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

export class ColorCommand implements Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder =
    new SlashCommandBuilder()
      .setName("color")
      .setDescription("Display color information and conversions")
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
          .setName("color")
          .setDescription("Color in hex format (#RRGGBB or RRGGBB)")
          .setRequired(true)
          .setMaxLength(7)
      );

  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    let colorInput = interaction.options.getString("color")!;

    // Remove # if present and validate
    colorInput = colorInput.replace("#", "");

    if (!/^[0-9A-Fa-f]{6}$/.test(colorInput)) {
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent("## ❌ Invalid Color")
        )
        .addTextDisplayComponents((text) =>
          text.setContent(
            "**Error:** Please provide a valid hex color (e.g., #FF5733 or FF5733)"
          )
        );

      await interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const hex = colorInput.toUpperCase();
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Convert to HSL
    const { h, s, l } = this.rgbToHsl(r, g, b);

    // Calculate luminance for contrast
    const luminance = this.calculateLuminance(r, g, b);
    const textColor = luminance > 0.5 ? "Black" : "White";

    const colorContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent("## 🎨 Color Information")
      )
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) => text.setContent(`**Hex:** #${hex}`))
      .addTextDisplayComponents((text) =>
        text.setContent(`**RGB:** rgb(${r}, ${g}, ${b})`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**HSL:** hsl(${h}°, ${s}%, ${l}%)`)
      )
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(`**Decimal:** ${parseInt(hex, 16).toLocaleString()}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Luminance:** ${(luminance * 100).toFixed(1)}%`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Suggested Text Color:** ${textColor}`)
      )
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(`**CSS:** \`color: #${hex};\``)
      );

    await interaction.reply({
      components: [colorContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  private rgbToHsl(
    r: number,
    g: number,
    b: number
  ): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const sum = max + min;

    const l = sum / 2;

    let h = 0;
    let s = 0;

    if (diff !== 0) {
      s = l > 0.5 ? diff / (2 - sum) : diff / sum;

      switch (max) {
        case r:
          h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / diff + 2) / 6;
          break;
        case b:
          h = ((r - g) / diff + 4) / 6;
          break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }

  private calculateLuminance(r: number, g: number, b: number): number {
    const components = [r, g, b].map((component) => {
      component /= 255;
      return component <= 0.03928
        ? component / 12.92
        : Math.pow((component + 0.055) / 1.055, 2.4);
    });

    return (
      0.2126 * (components[0] || 0) +
      0.7152 * (components[1] || 0) +
      0.0722 * (components[2] || 0)
    );
  }
}

export default ColorCommand;
