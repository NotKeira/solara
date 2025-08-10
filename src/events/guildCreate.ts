import { Events, Guild } from "discord.js";
import { Event } from "@/types";

export class GuildCreateEvent implements Event {
  name = Events.GuildCreate as const;

  async execute(guild: Guild): Promise<void> {
    console.log(`Joined guild: ${guild.name} (${guild.id})`);

    try {
      // TODO: Insert guild data into database
      // const client: ExtendedClient = guild.client as ExtendedClient;
      // await client.database.insert(guilds).values({
      //   id: guild.id,
      //   name: guild.name,
      //   ownerId: guild.ownerId,
      // }).onConflictDoUpdate({
      //   target: guilds.id,
      //   set: {
      //     name: guild.name,
      //     ownerId: guild.ownerId,
      //     updatedAt: new Date(),
      //   }
      // });

      // TODO: Create default guild settings
      // await client.database.insert(guildSettings).values({
      //   guildId: guild.id,
      // }).onConflictDoNothing();

      console.log(
        `Successfully set up database records for guild ${guild.name}`
      );
    } catch (error) {
      console.error(`Error setting up guild ${guild.name}:`, error);
    }
  }
}

export default GuildCreateEvent;
