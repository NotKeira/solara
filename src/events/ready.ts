import { Events } from "discord.js";
import { Event, ExtendedClient } from "@/types";

export class ReadyEvent implements Event {
  name = Events.ClientReady as const;
  once = true;

  execute(client: ExtendedClient): void {
    console.log(`Bot is ready! Logged in as ${client.user?.tag}`);
  }
}

export default ReadyEvent;
