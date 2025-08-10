import { Database } from "@/database";
import { Client, Collection } from "discord.js";
import { Command } from "./Command";

export interface ExtendedClient extends Client {
    commands: Collection<string, Command>;
    database: typeof Database;
}