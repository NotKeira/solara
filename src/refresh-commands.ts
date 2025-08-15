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
    console.log("🚀 Starting command deployment...");

    await deployGlobalCommands();
    await deployGuildCommands();

    console.log("\n✅ Command deployment completed successfully!");
  } catch (error) {
    console.error("❌ Error deploying commands:", error);
    process.exit(1);
  }
}

async function deployGlobalCommands() {
  console.log(
    `\n📋 Comparing ${commands.length} local commands with deployed commands...`
  );

  const deployedCommands = (await rest.get(
    Routes.applicationCommands(clientId)
  )) as any[];

  const analysis = analyzeCommandDifferences(commands, deployedCommands);

  console.log(`\n📊 Global Command Analysis:`);
  console.log(`  • New commands: ${analysis.newCommands.length}`);
  console.log(
    `  • Updated commands: ${
      analysis.commandsToUpdate.length - analysis.newCommands.length
    }`
  );
  console.log(`  • Unchanged commands: ${analysis.unchangedCommands.length}`);
  console.log(`  • Commands to delete: ${analysis.commandsToDelete.length}`);

  // Show detailed information about changes
  if (analysis.newCommands.length > 0) {
    console.log(`\n🆕 New Commands:`);
    analysis.newCommands.forEach((cmd) => {
      console.log(`   • ${cmd.name} - ${cmd.description}`);
    });
  }

  if (analysis.updatedCommands.length > 0) {
    console.log(`\n🔄 Updated Commands:`);
    analysis.updatedCommands.forEach((cmd) => {
      console.log(`   • ${cmd.name}`);
    });
  }

  if (analysis.commandsToDelete.length > 0) {
    console.log(`\n🗑️ Commands to Delete:`);
    analysis.commandsToDelete.forEach((cmd) => {
      console.log(`   • ${cmd.name}`);
    });
  }

  if (analysis.unchangedCommands.length > 0) {
    console.log(`\n✅ Unchanged Commands:`);
    analysis.unchangedCommands.forEach((cmdName) => {
      console.log(`   • ${cmdName}`);
    });
  }

  if (
    analysis.commandsToUpdate.length > 0 ||
    analysis.commandsToDelete.length > 0
  ) {
    console.log(
      `\n🔄 Updating ${analysis.commandsToUpdate.length} global command(s)...`
    );
    const globalData = await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });
    console.log(
      `✅ Successfully updated ${(globalData as any).length} global commands.`
    );
  } else {
    console.log("\n✅ All global commands are up to date!");
  }
}

async function deployGuildCommands() {
  if (!shouldDeployGuildCommands()) {
    return;
  }

  console.log(
    `\n📋 Comparing ${guildSpecificCommands.length} guild commands...`
  );

  const deployedGuildCommands = (await rest.get(
    Routes.applicationGuildCommands(clientId, guildId!)
  )) as any[];

  const analysis = analyzeCommandDifferences(
    guildSpecificCommands,
    deployedGuildCommands
  );

  console.log(`\n📊 Guild Command Analysis:`);
  console.log(`  • New commands: ${analysis.newCommands.length}`);
  console.log(`  • Updated commands: ${analysis.updatedCommands.length}`);
  console.log(`  • Unchanged commands: ${analysis.unchangedCommands.length}`);
  console.log(`  • Commands to delete: ${analysis.commandsToDelete.length}`);

  // Show detailed information about changes
  if (analysis.newCommands.length > 0) {
    console.log(`\n🆕 New Guild Commands:`);
    analysis.newCommands.forEach((cmd) => {
      console.log(`   • ${cmd.name} - ${cmd.description}`);
    });
  }

  if (analysis.updatedCommands.length > 0) {
    console.log(`\n🔄 Updated Guild Commands:`);
    analysis.updatedCommands.forEach((cmd) => {
      console.log(`   • ${cmd.name}`);
    });
  }

  if (analysis.commandsToDelete.length > 0) {
    console.log(`\n🗑️ Guild Commands to Delete:`);
    analysis.commandsToDelete.forEach((cmd) => {
      console.log(`   • ${cmd.name}`);
    });
  }

  if (analysis.unchangedCommands.length > 0) {
    console.log(`\n✅ Unchanged Guild Commands:`);
    analysis.unchangedCommands.forEach((cmdName) => {
      console.log(`   • ${cmdName}`);
    });
  }

  if (
    analysis.commandsToUpdate.length > 0 ||
    analysis.commandsToDelete.length > 0
  ) {
    console.log(`\n🔄 Updating guild commands...`);
    const guildData = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId!),
      { body: guildSpecificCommands }
    );
    console.log(
      `✅ Successfully updated ${(guildData as any).length} guild commands.`
    );
  } else {
    console.log("\n✅ All guild commands are up to date!");
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
  const updatedCommands = [];
  const unchangedCommands = [];

  for (const localCommand of localCommands) {
    const deployedCommand = deployedCommandMap.get(localCommand.name);

    if (!deployedCommand) {
      newCommands.push(localCommand);
      commandsToUpdate.push(localCommand);
    } else if (commandNeedsUpdate(localCommand, deployedCommand)) {
      updatedCommands.push(localCommand);
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
    updatedCommands,
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

  const changedFields = getChangedFields(normalisedLocal, normalisedDeployed, fieldsToCompare);

  if (changedFields.length > 0) {
    logCommandChanges(localCommand.name, changedFields);
    return true;
  }

  return false;
}

function getChangedFields(normalisedLocal: any, normalisedDeployed: any, fieldsToCompare: string[]): any[] {
  const changedFields = [];

  for (const field of fieldsToCompare) {
    const localValue = normalisedLocal[field];
    const deployedValue = normalisedDeployed[field];

    // Handle Discord's auto-added defaults - treat them as equivalent to null/undefined
    if (isDiscordDefault(field, localValue, deployedValue)) {
      continue; // Skip comparison for Discord defaults
    }

    // Special case: if options are arrays and stringify to the same thing, consider them equal
    if (
      field === "options" &&
      Array.isArray(localValue) &&
      Array.isArray(deployedValue)
    ) {
      const localStr = JSON.stringify(localValue);
      const deployedStr = JSON.stringify(deployedValue);
      if (localStr === deployedStr) {
        continue; // Skip if they're actually identical when stringified
      }
    }

    if (!deepEqual(localValue, deployedValue)) {
      changedFields.push({
        field,
        local: localValue,
        deployed: deployedValue,
      });
    }
  }

  return changedFields;
}

function logCommandChanges(commandName: string, changedFields: any[]): void {
  console.log(`\n🔄 Command '${commandName}' needs update:`);
  changedFields.forEach((change) => {
    console.log(`   • ${change.field}:`);
    console.log(`     Local:    ${JSON.stringify(change.local)}`);
    console.log(`     Deployed: ${JSON.stringify(change.deployed)}`);

    // Additional debugging for options field
    if (
      change.field === "options" &&
      Array.isArray(change.local) &&
      Array.isArray(change.deployed)
    ) {
      logOptionsChanges(change.local, change.deployed);
    }
  });
}

function logOptionsChanges(localOptions: any[], deployedOptions: any[]): void {
  console.log(
    `     → Comparing ${localOptions.length} local vs ${deployedOptions.length} deployed options`
  );
  for (
    let i = 0;
    i < Math.max(localOptions.length, deployedOptions.length);
    i++
  ) {
    const localOpt = localOptions[i];
    const deployedOpt = deployedOptions[i];
    if (!deepEqual(localOpt, deployedOpt)) {
      console.log(`     → Option ${i} differs:`);
      console.log(`       Local:    ${JSON.stringify(localOpt)}`);
      console.log(`       Deployed: ${JSON.stringify(deployedOpt)}`);

      // Show property-by-property comparison
      const allProps = new Set([
        ...Object.keys(localOpt || {}),
        ...Object.keys(deployedOpt || {}),
      ]);
      for (const prop of allProps) {
        if (!deepEqual(localOpt?.[prop], deployedOpt?.[prop])) {
          console.log(
            `         ${prop}: ${JSON.stringify(
              localOpt?.[prop]
            )} vs ${JSON.stringify(deployedOpt?.[prop])}`
          );
        }
      }
    }
  }
}

function isDiscordDefault(
  field: string,
  localValue: any,
  deployedValue: any
): boolean {
  // Only show debug info if DEBUG environment variable is set
  const debug = process.env["DEBUG"] === "true";

  if (debug) {
    console.log(`🔍 Checking ${field}:`);
    console.log(
      `   Local: ${JSON.stringify(localValue)} (${typeof localValue})`
    );
    console.log(
      `   Deployed: ${JSON.stringify(deployedValue)} (${typeof deployedValue})`
    );
  }

  // Check for Discord defaults
  const isDefault = checkForDiscordDefaults(field, localValue, deployedValue);

  if (debug && isDefault) {
    console.log(`   → Treating as Discord default (${field})`);
  } else if (debug) {
    console.log(`   → No default handling applied`);
  }

  return isDefault;
}

function checkForDiscordDefaults(
  field: string,
  localValue: any,
  deployedValue: any
): boolean {
  // dm_permission: Discord defaults to true when not specified
  if (field === "dm_permission") {
    return (
      (localValue === null || localValue === undefined) &&
      deployedValue === true
    );
  }

  // integration_types: Discord defaults to [0,1] when not specified
  if (field === "integration_types") {
    return (
      (localValue === null || localValue === undefined) &&
      JSON.stringify(deployedValue) === "[0,1]"
    );
  }

  // contexts: Discord reorders arrays, so compare sorted versions
  if (
    field === "contexts" &&
    Array.isArray(localValue) &&
    Array.isArray(deployedValue)
  ) {
    const sortedLocal = [...localValue].sort((a, b) => a - b);
    const sortedDeployed = [...deployedValue].sort((a, b) => a - b);
    return JSON.stringify(sortedLocal) === JSON.stringify(sortedDeployed);
  }

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

  // Always include required field for consistency (Discord includes it)
  normalised.required = option.required === true;

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
