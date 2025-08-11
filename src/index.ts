import { Client, GatewayIntentBits as Intents, Collection } from "discord.js";
import { ExtendedClient, Command, Event } from "@/types";
import * as Events from "@/events";
import * as Commands from "@/commands";
import { Database } from "@/database";
import "dotenv/config";

const token: string = process.env["TOKEN"] || "";

if (!token) {
  console.error(
    "No token provided! Please set the TOKEN environment variable."
  );
  process.exit(1);
}

const client: ExtendedClient = new Client({
  intents: [
    Intents.Guilds,
    Intents.GuildMembers, // Only if you need member events
  ],
}) as ExtendedClient;

// Initialize client properties
client.commands = new Collection<string, Command>();
client.database = Database;

// Register commands
for (const command of Object.values(Commands)) {
  if (typeof command === "function") {
    const commandInstance = new command();
    client.commands.set(commandInstance.data.name, commandInstance);
  }
}

// Register events
for (const EventClass of Object.values(Events)) {
  if (typeof EventClass === "function") {
    const eventInstance: Event = new EventClass();

    if (eventInstance.once) {
      client.once(eventInstance.name as any, (...args: any[]) =>
        eventInstance.execute(...args)
      );
    } else {
      client.on(eventInstance.name as any, (...args: any[]) =>
        eventInstance.execute(...args)
      );
    }

    console.log(`Registered event: ${eventInstance.name}`);
  }
}

// Login to Discord
client.login(token).catch(console.error);
