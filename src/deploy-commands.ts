import { REST, Routes } from "discord.js";
import * as Commands from "@/commands";
import "dotenv/config";

const token: string = process.env["TOKEN"]!;
const clientId: string = process.env["CLIENT_ID"]!;
const guildId: string | undefined = process.env["GUILD_ID"];
const guildCommands: string | undefined = process.env["GUILD_COMMANDS"];

if (!token || !clientId) {
  console.error("Missing TOKEN or CLIENT_ID in environment variables");
  process.exit(1);
}

const rest = new REST().setToken(token);

const commands: any[] = [];
const guildSpecificCommands: any[] = [];

// Convert command classes to JSON
for (const CommandClass of Object.values(Commands)) {
  if (typeof CommandClass === "function") {
    const command = new CommandClass();
    const commandData = command.data.toJSON();
    commands.push(commandData);

    // Check if this command should be deployed to guild
    if (guildId && guildCommands && guildCommands !== "null") {
      const allowedGuildCommands = guildCommands
        .split(",")
        .map((cmd) => cmd.trim());
      if (allowedGuildCommands.includes(commandData.name)) {
        guildSpecificCommands.push(commandData);
      }
    }
  }
}

async function deployCommands() {
  try {
    await deployGlobalCommands();
    await deployGuildCommands();
  } catch (error) {
    console.error("Error deploying commands:", error);
  }
}

async function deployGlobalCommands() {
  console.log(
    `Comparing ${commands.length} local commands with deployed commands...`
  );

  const deployedCommands = (await rest.get(
    Routes.applicationCommands(clientId)
  )) as any[];

  const analysis = analyzeCommandDifferences(commands, deployedCommands);

  console.log(`📊 Global Command Analysis:`);
  console.log(`  • New commands: ${analysis.newCommands.length}`);
  console.log(
    `  • Updated commands: ${
      analysis.commandsToUpdate.length - analysis.newCommands.length
    }`
  );
  console.log(`  • Unchanged commands: ${analysis.unchangedCommands.length}`);
  console.log(`  • Commands to delete: ${analysis.commandsToDelete.length}`);

  if (
    analysis.commandsToUpdate.length > 0 ||
    analysis.commandsToDelete.length > 0
  ) {
    console.log(
      `🔄 Updating ${analysis.commandsToUpdate.length} global command(s)...`
    );
    const globalData = await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });
    console.log(
      `✅ Successfully updated ${(globalData as any).length} global commands.`
    );
  } else {
    console.log("✅ All global commands are up to date!");
  }
}

async function deployGuildCommands() {
  if (!shouldDeployGuildCommands()) {
    return;
  }

  console.log(`\nComparing ${guildSpecificCommands.length} guild commands...`);

  const deployedGuildCommands = (await rest.get(
    Routes.applicationGuildCommands(clientId, guildId!)
  )) as any[];

  const analysis = analyzeCommandDifferences(
    guildSpecificCommands,
    deployedGuildCommands
  );

  console.log(`📊 Guild Command Analysis:`);
  console.log(`  • New commands: ${analysis.newCommands.length}`);
  console.log(
    `  • Updated commands: ${
      analysis.commandsToUpdate.length - analysis.newCommands.length
    }`
  );
  console.log(`  • Unchanged commands: ${analysis.unchangedCommands.length}`);
  console.log(`  • Commands to delete: ${analysis.commandsToDelete.length}`);

  if (
    analysis.commandsToUpdate.length > 0 ||
    analysis.commandsToDelete.length > 0
  ) {
    console.log(`🔄 Updating guild commands...`);
    const guildData = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId!),
      { body: guildSpecificCommands }
    );
    console.log(
      `✅ Successfully updated ${(guildData as any).length} guild commands.`
    );
  } else {
    console.log("✅ All guild commands are up to date!");
  }
}

function shouldDeployGuildCommands(): boolean {
  return !!(
    guildId &&
    guildCommands &&
    guildCommands !== "null" &&
    guildSpecificCommands.length > 0
  );
}

function analyzeCommandDifferences(
  localCommands: any[],
  deployedCommands: any[]
) {
  const deployedCommandMap = new Map();
  deployedCommands.forEach((cmd) => {
    deployedCommandMap.set(cmd.name, cmd);
  });

  const commandsToUpdate = [];
  const newCommands = [];
  const unchangedCommands = [];

  for (const localCommand of localCommands) {
    const deployedCommand = deployedCommandMap.get(localCommand.name);

    if (!deployedCommand) {
      newCommands.push(localCommand);
      commandsToUpdate.push(localCommand);
    } else if (commandNeedsUpdate(localCommand, deployedCommand)) {
      commandsToUpdate.push(localCommand);
    } else {
      unchangedCommands.push(localCommand.name);
    }
  }

  const localCommandNames = new Set(localCommands.map((cmd) => cmd.name));
  const commandsToDelete = deployedCommands.filter(
    (cmd) => !localCommandNames.has(cmd.name)
  );

  return {
    commandsToUpdate,
    newCommands,
    unchangedCommands,
    commandsToDelete,
  };
}

function commandNeedsUpdate(localCommand: any, deployedCommand: any): boolean {
  const normalisedLocal = normaliseCommand(localCommand);
  const normalisedDeployed = normaliseCommand(deployedCommand);

  const fieldsToCompare = [
    "name",
    "description",
    "options",
    "default_member_permissions",
    "dm_permission",
    "nsfw",
    "integration_types",
    "contexts",
    "name_localizations",
    "description_localizations",
  ];

  for (const field of fieldsToCompare) {
    const localValue = normalisedLocal[field];
    const deployedValue = normalisedDeployed[field];

    // Handle Discord's auto-added defaults - treat them as equivalent to null/undefined
    if (isDiscordDefault(field, localValue, deployedValue)) {
      continue; // Skip comparison for Discord defaults
    }

    if (!deepEqual(localValue, deployedValue)) {
      console.log(
        `🔄 Command '${localCommand.name}' needs update: ${field} changed`
      );
      console.log(`   Local:    ${JSON.stringify(localValue)}`);
      console.log(`   Deployed: ${JSON.stringify(deployedValue)}`);
      return true;
    }
  }

  return false;
}

function isDiscordDefault(
  field: string,
  localValue: any,
  deployedValue: any
): boolean {
  console.log(`🔍 Checking ${field}:`);
  console.log(`   Local: ${JSON.stringify(localValue)} (${typeof localValue})`);
  console.log(
    `   Deployed: ${JSON.stringify(deployedValue)} (${typeof deployedValue})`
  );

  // dm_permission: Discord defaults to true when not specified
  if (field === "dm_permission") {
    if (
      (localValue === null || localValue === undefined) &&
      deployedValue === true
    ) {
      console.log(`   → Treating as Discord default (dm_permission)`);
      return true;
    }
  }

  // integration_types: Discord defaults to [0,1] when not specified
  if (field === "integration_types") {
    if (
      (localValue === null || localValue === undefined) &&
      JSON.stringify(deployedValue) === "[0,1]"
    ) {
      console.log(`   → Treating as Discord default (integration_types)`);
      return true;
    }
  }

  // contexts: Discord reorders arrays, so compare sorted versions
  if (field === "contexts") {
    if (Array.isArray(localValue) && Array.isArray(deployedValue)) {
      const sortedLocal = [...localValue].sort((a, b) => a - b);
      const sortedDeployed = [...deployedValue].sort((a, b) => a - b);
      if (JSON.stringify(sortedLocal) === JSON.stringify(sortedDeployed)) {
        console.log(`   → Arrays contain same values (different order)`);
        return true;
      }
    }
  }

  console.log(`   → No default handling applied`);
  return false;
}

function normaliseCommand(command: any): any {
  const normalised: any = {};

  // Normalise name and description
  normalised.name = command.name || null;
  normalised.description = command.description || null;

  // Normalise options - handle empty array vs undefined
  if (command.options && command.options.length > 0) {
    normalised.options = command.options.map(normaliseOption);
  } else {
    normalised.options = null; // Treat empty array and undefined the same
  }

  // Normalise permissions (can be string or null)
  normalised.default_member_permissions =
    command.default_member_permissions || null;

  // Normalise boolean fields (Discord omits false values)
  normalised.dm_permission = command.dm_permission === true ? true : null;
  normalised.nsfw = command.nsfw === true ? true : null;

  // Normalise arrays (Discord omits empty arrays)
  normalised.integration_types =
    command.integration_types && command.integration_types.length > 0
      ? command.integration_types
      : null;
  normalised.contexts =
    command.contexts && command.contexts.length > 0 ? command.contexts : null;

  // Normalise localizations
  normalised.name_localizations = command.name_localizations || null;
  normalised.description_localizations =
    command.description_localizations || null;

  return normalised;
}

function normaliseOption(option: any): any {
  const normalised: any = {
    type: option.type,
    name: option.name,
    description: option.description,
  };

  // Only include required if it's true (Discord omits required: false)
  if (option.required === true) {
    normalised.required = true;
  }

  // Include other option properties if they exist
  if (option.choices && option.choices.length > 0) {
    normalised.choices = option.choices;
  }

  if (option.options && option.options.length > 0) {
    normalised.options = option.options.map(normaliseOption);
  }

  if (option.channel_types && option.channel_types.length > 0) {
    normalised.channel_types = option.channel_types;
  }

  if (option.min_value !== undefined) {
    normalised.min_value = option.min_value;
  }

  if (option.max_value !== undefined) {
    normalised.max_value = option.max_value;
  }

  if (option.min_length !== undefined) {
    normalised.min_length = option.min_length;
  }

  if (option.max_length !== undefined) {
    normalised.max_length = option.max_length;
  }

  if (option.autocomplete === true) {
    normalised.autocomplete = true;
  }

  return normalised;
}

function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  if (typeof obj1 !== typeof obj2) return false;

  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  if (Array.isArray(obj1)) return compareArrays(obj1, obj2);
  if (typeof obj1 === "object") return compareObjects(obj1, obj2);

  return obj1 === obj2;
}

function compareArrays(arr1: any[], arr2: any[]): boolean {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (!deepEqual(arr1[i], arr2[i])) return false;
  }
  return true;
}

function compareObjects(obj1: any, obj2: any): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;
  return keys1.every(
    (key) => keys2.includes(key) && deepEqual(obj1[key], obj2[key])
  );
}

deployCommands();
