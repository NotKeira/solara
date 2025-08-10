import { ExtendedClient, Event } from "@/types";
import {
  filterCountries,
  filterTimezones,
  getTimezoneDisplayName,
} from "@/utils";
import {
  AutocompleteInteraction,
  Events,
  Interaction,
  InteractionReplyOptions,
  MessageFlags,
} from "discord.js";

export class InteractionCreateEvent implements Event {
  name = Events.InteractionCreate as const;

  async execute(interaction: Interaction): Promise<void> {
    const client: ExtendedClient = interaction.client as ExtendedClient;

    if (interaction.isChatInputCommand() || interaction.isCommand()) {
      await this.handleCommand(interaction, client);
    } else if (interaction.isAutocomplete()) {
      await this.handleAutocomplete(interaction);
    }
  }

  private async handleCommand(
    interaction: Interaction,
    client: ExtendedClient
  ): Promise<void> {
    if (!interaction.isChatInputCommand() || !interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`
      );
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await this.sendErrorResponse(interaction);
    }
  }

  private async sendErrorResponse(interaction: Interaction): Promise<void> {
    if (interaction.isAutocomplete()) return;
    const errorMessage: InteractionReplyOptions = {
      content: "There was an error while executing this command!",
      flags: MessageFlags.Ephemeral,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }

  private async handleAutocomplete(
    interaction: AutocompleteInteraction
  ): Promise<void> {
    try {
      const focusedOption = interaction.options.getFocused(true);

      switch (focusedOption.name) {
        case "country": {
          const query = focusedOption.value;
          const countries = filterCountries(query, 25);

          await interaction.respond(
            countries.slice(0, 25).map((country) => ({
              name: country,
              value: country,
            }))
          );
          break;
        }

        case "tz": {
          const query = focusedOption.value;
          const timezones = filterTimezones(query, 25);

          const choices = timezones.slice(0, 25).map((timezone) => {
            const displayName = getTimezoneDisplayName(timezone);
            // Truncate long display names for Discord's limit
            const truncatedName =
              displayName.length > 100
                ? displayName.substring(0, 97) + "..."
                : displayName;

            return {
              name: truncatedName,
              value: timezone,
            };
          });

          await interaction.respond(choices);
          break;
        }

        default: {
          // Fallback for unknown option
          await interaction.respond([]);
          break;
        }
      }
    } catch (error) {
      console.error("Error in timezone autocomplete:", error);
      // Always respond, even if with empty array to avoid Discord errors
      try {
        await interaction.respond([]);
      } catch (respondError) {
        console.error("Failed to respond to autocomplete:", respondError);
      }
    }
  }
}

export default InteractionCreateEvent;
