import type { Command } from "@/types";
import {
  ApplicationIntegrationType,
  ContainerBuilder,
  Interaction,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  User,
  GuildMember,
} from "discord.js";

export class UserinfoCommand implements Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder =
    new SlashCommandBuilder()
      .setName("userinfo")
      .setDescription("Display detailed information about a user")
      .setContexts(
        InteractionContextType.BotDM,
        InteractionContextType.Guild,
        InteractionContextType.PrivateChannel
      )
      .setIntegrationTypes(
        ApplicationIntegrationType.GuildInstall,
        ApplicationIntegrationType.UserInstall
      )
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user to get information about")
          .setRequired(false)
      );

  private buildBasicUserInfo(user: User): ContainerBuilder {
    const container = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(`## User Information: ${user.displayName}`)
      )
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(`**Username:** ${user.username}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Display Name:** ${user.displayName}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**User ID:** \`${user.id}\``)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**Account Created:** <t:${Math.floor(
            user.createdTimestamp / 1000
          )}:F>`
        )
      )
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**Account Age:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>`
        )
      );

    // Add bot status
    if (user.bot) {
      container.addTextDisplayComponents((text) =>
        text.setContent("**Type:** Bot")
      );
    } else {
      container.addTextDisplayComponents((text) =>
        text.setContent("**Type:** User")
      );
    }

    return container;
  }

  private addServerInfo(
    container: ContainerBuilder,
    member: GuildMember,
    guildId: string
  ): void {
    container
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent("## Server Information")
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Nickname:** ${member.nickname || "None"}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**Joined Server:** <t:${Math.floor(
            (member.joinedTimestamp || 0) / 1000
          )}:F>`
        )
      )
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**Join Age:** <t:${Math.floor(
            (member.joinedTimestamp || 0) / 1000
          )}:R>`
        )
      );

    this.addRolesInfo(container, member, guildId);
    this.addPermissionsInfo(container, member);
  }

  private addRolesInfo(
    container: ContainerBuilder,
    member: GuildMember,
    guildId: string
  ): void {
    const roles = member.roles.cache
      .filter((role) => role.id !== guildId) // Exclude @everyone
      .sort((a, b) => b.position - a.position)
      .map((role) => role.toString())
      .slice(0, 10); // Limit to first 10 roles

    if (roles.length > 0) {
      container.addTextDisplayComponents((text) =>
        text.setContent(
          `**Roles (${member.roles.cache.size - 1}):** ${roles.join(", ")}${
            member.roles.cache.size > 11 ? "..." : ""
          }`
        )
      );
    }

    // Add highest role
    const highestRole = member.roles.highest;
    if (highestRole.id !== guildId) {
      container.addTextDisplayComponents((text) =>
        text.setContent(`**Highest Role:** ${highestRole}`)
      );
    }
  }

  private addPermissionsInfo(
    container: ContainerBuilder,
    member: GuildMember
  ): void {
    if (member.permissions.has("Administrator")) {
      container.addTextDisplayComponents((text) =>
        text.setContent("**Permissions:** Administrator")
      );
      return;
    }

    const keyPerms: string[] = [];
    if (member.permissions.has("ManageGuild")) keyPerms.push("Manage Server");
    if (member.permissions.has("ManageRoles")) keyPerms.push("Manage Roles");
    if (member.permissions.has("ManageChannels"))
      keyPerms.push("Manage Channels");
    if (member.permissions.has("ManageMessages"))
      keyPerms.push("Manage Messages");
    if (member.permissions.has("KickMembers")) keyPerms.push("Kick Members");
    if (member.permissions.has("BanMembers")) keyPerms.push("Ban Members");
    if (member.permissions.has("ModerateMembers"))
      keyPerms.push("Timeout Members");

    if (keyPerms.length > 0) {
      container.addTextDisplayComponents((text) =>
        text.setContent(`**Key Permissions:** ${keyPerms.join(", ")}`)
      );
    }
  }

  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const targetUser: User =
      interaction.options.getUser("user") || interaction.user;
    const member: GuildMember | null =
      interaction.guild?.members.cache.get(targetUser.id) || null;

    const userContainer = this.buildBasicUserInfo(targetUser);

    // Add server-specific information if in a guild
    if (member && interaction.guild) {
      this.addServerInfo(userContainer, member, interaction.guild.id);
    }

    await interaction.reply({
      components: [userContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}

export default UserinfoCommand;
