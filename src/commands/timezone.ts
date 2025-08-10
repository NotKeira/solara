import type { Command } from "@/types";
import {
  getUserTimezone,
  setUserTimezone,
  formatTimeInTimezone,
  getTimezoneDisplayName,
  COUNTRY_TIMEZONES,
  isValidTimezone,
} from "@/utils/timezone";
import {
  Interaction,
  SlashCommandBuilder,
  MessageFlags,
  InteractionContextType,
  ApplicationIntegrationType,
  TextDisplayBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  User,
} from "discord.js";

export class TZCommand implements Command {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder =
    new SlashCommandBuilder()
      .setName("timezone")
      .setDescription("Timezone commands")
      .setContexts(
        InteractionContextType.BotDM,
        InteractionContextType.Guild,
        InteractionContextType.PrivateChannel
      )
      .setIntegrationTypes(
        ApplicationIntegrationType.GuildInstall,
        ApplicationIntegrationType.UserInstall
      )
      .addSubcommand((sub) =>
        sub
          .setName("find")
          .setDescription("Find a timezone based on a country")
          .addStringOption((opt) =>
            opt
              .setName("country")
              .setDescription("Country to search for timezones")
              .setRequired(true)
              .setAutocomplete(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName("get")
          .setDescription("Get a user's timezone")
          .addUserOption((opt) =>
            opt
              .setName("user")
              .setDescription("User to get timezone for")
              .setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName("set")
          .setDescription("Set a timezone for yourself or another user")
          .addStringOption((opt) =>
            opt
              .setName("tz")
              .setDescription("Timezone to set")
              .setRequired(true)
              .setAutocomplete(true)
          )
          .addUserOption((opt) =>
            opt
              .setName("user")
              .setDescription("User to set timezone for (admin only)")
              .setRequired(false)
          )
      );

  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isCommand() || !interaction.isChatInputCommand()) {
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "find":
        await this.handleFindCommand(interaction);
        break;
      case "get":
        await this.handleGetCommand(interaction);
        break;
      case "set":
        await this.handleSetCommand(interaction);
        break;
      default:
        await interaction.reply({
          components: [
            new TextDisplayBuilder().setContent("❌ Unknown subcommand."),
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
    }
  }

  private async handleFindCommand(interaction: any): Promise<void> {
    const country: string = interaction.options.getString("country", true);
    const timezones = COUNTRY_TIMEZONES[country];

    if (!timezones || timezones.length === 0) {
      await interaction.reply({
        components: [
          new TextDisplayBuilder().setContent(
            `❌ No timezones found for country: **${country}**`
          ),
        ],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
      return;
    }

    const timezoneList = timezones
      .map((tz) => `• ${getTimezoneDisplayName(tz)}`)
      .join("\n");

    await interaction.reply({
      components: [
        new TextDisplayBuilder().setContent(
          `🌍 **Timezones for ${country}:**\n\n${timezoneList}`
        ),
      ],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications,
    });
  }

  private async handleGetCommand(interaction: any): Promise<void> {
    const user: User = interaction.options.getUser("user", true);
    const timezone = await getUserTimezone(user.id);

    if (!timezone) {
      await interaction.reply({
        components: [
          new TextDisplayBuilder().setContent(
            `❌ **${user.username}** has not set a timezone yet.`
          ),
        ],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
      return;
    }

    const currentTime = formatTimeInTimezone(timezone);
    const displayName = getTimezoneDisplayName(timezone);

    await interaction.reply({
      components: [
        new TextDisplayBuilder().setContent(
          `🕐 **${user.username}'s timezone:** ${displayName}\n**Current time:** ${currentTime}`
        ),
      ],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications,
    });
  }

  private async handleSetCommand(interaction: any): Promise<void> {
    const tz = interaction.options.getString("tz", true);
    const targetUser = interaction.options.getUser("user") ?? interaction.user;

    // Check if user is trying to set timezone for someone else
    if (targetUser.id !== interaction.user.id) {
      // Check if user has administrator permissions
      if ((interaction.user.id as bigint) !== 801384603704623115n) {
        await interaction.reply({
          components: [
            new TextDisplayBuilder().setContent(
              "❌ You don't have permissions to set timezone for other users."
            ),
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
        return;
      }
    }

    // Validate timezone
    if (!isValidTimezone(tz)) {
      await interaction.reply({
        components: [
          new TextDisplayBuilder().setContent(
            `❌ **${tz}** is not a valid timezone. Please use a valid IANA timezone identifier.`
          ),
        ],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
      return;
    }

    // Set timezone in database
    const success = await setUserTimezone(
      targetUser.id,
      targetUser.username,
      tz
    );

    if (!success) {
      await interaction.reply({
        components: [
          new TextDisplayBuilder().setContent(
            "❌ Failed to set timezone. Please try again later."
          ),
        ],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
      return;
    }

    const currentTime = formatTimeInTimezone(tz);
    const displayName = getTimezoneDisplayName(tz);

    await interaction.reply({
      components: [
        new TextDisplayBuilder().setContent(
          `✅ Set timezone for **${targetUser.username}** to **${displayName}**\n**Current time:** ${currentTime}`
        ),
      ],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications,
    });
  }
}

export default TZCommand;
