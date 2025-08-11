import { Client, GatewayIntentBits as Intents, Collection } from "discord.js";
import { ExtendedClient, Command, Event } from "@/types";
import * as Events from "@/events";
import * as Commands from "@/commands";
import { Database } from "@/database";
import {
  logMemoryUsage,
  startMemoryMonitoring,
  checkForMemoryLeaks,
} from "@/utils/memory-profiler";
import "dotenv/config";

const token: string = process.env["TOKEN"] || "";

if (!token) {
  console.error(
    "No token provided! Please set the TOKEN environment variable."
  );
  process.exit(1);
}

// Start memory profiling
logMemoryUsage("Bot Startup");
const memoryTracker = checkForMemoryLeaks();

const client: ExtendedClient = new Client({
  intents: [
    Intents.Guilds,
    Intents.GuildMembers, // Only if you need member events
  ],
  // Reduce cache sizes to save memory
  sweepers: {
    messages: {
      interval: 300, // 5 minutes
      lifetime: 900, // 15 minutes (reduced from 30)
    },
    users: {
      interval: 300,
      filter: () => (user) => user.bot && user.id !== client.user?.id,
    },
  },
}) as ExtendedClient;

// Initialize client properties
client.commands = new Collection<string, Command>();
client.database = Database;

// Register commands
logMemoryUsage("Before Command Registration");
for (const command of Object.values(Commands)) {
  if (typeof command === "function") {
    const commandInstance = new command();
    client.commands.set(commandInstance.data.name, commandInstance);
  }
}
logMemoryUsage("After Command Registration");

// Register events
logMemoryUsage("Before Event Registration");
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
logMemoryUsage("After Event Registration");

// Login to Discord
client.login(token).catch(console.error);

// Start continuous memory monitoring (every 2 minutes)
startMemoryMonitoring(120000);

// Force garbage collection after setup (if --expose-gc flag is used)
if (global.gc) {
  setTimeout(() => {
    global.gc?.();
    logMemoryUsage("After Initial GC");

    // Force additional cleanup
    setTimeout(() => {
      global.gc?.();
      logMemoryUsage("After Second GC");
      memoryTracker.start();
    }, 2000);
  }, 5000);
}
