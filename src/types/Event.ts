import { ClientEvents, Events } from "discord.js";

export interface Event<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K | Events;
  once?: boolean;
  execute: (...args: any[]) => void | Promise<void>;
}
