import { Command } from "@/types";
import {
  SlashCommandBuilder,
  Interaction,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  MessageFlags,
  ContainerBuilder,
  InteractionContextType,
  ApplicationIntegrationType,
  GuildMember,
  User,
} from "discord.js";
import { Database } from "@/database";
import { moderationCases } from "@/database/schema";
import { generateUniqueCaseId } from "@/utils/case-management";
import { ensureGuildExists, storeUser } from "@/utils/moderation";
import { JokeMessageGenerator } from "@/utils/joke-generator";

const joker = new JokeMessageGenerator();

export class UnbanCommand implements Command {
  data = new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user from the server")
    .setContexts(InteractionContextType.Guild)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to unban")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the unban")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    if (!interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetUser: User = interaction.options.getUser("user", true);
    const reason: string =
      interaction.options.getString("reason") ?? "No reason provided";
    try {
      // Validate unban request
      const validationResult = await this.validateUnbanRequest(
        interaction,
        targetUser
      );
      if (!validationResult.isValid) {
        await interaction.reply({
          components: [validationResult.errorContainer!],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Execute the ban
      await this.executeUnban(interaction, targetUser, reason);
    } catch (error) {
      console.error("Error unbanning user:", error);
      await this.sendErrorResponse(interaction);
    }
  }

  private async validateUnbanRequest(
    interaction: Interaction,
    targetUser: any
  ): Promise<{
    isValid: boolean;
    errorContainer?: ContainerBuilder;
    member?: GuildMember | null;
    duration?: number | null;
    expiresAt?: Date | null;
  }> {
    // Check if user is trying to ban themselves
    if (targetUser.id === interaction.user.id) {
      return {
        isValid: false,
        errorContainer: new ContainerBuilder()
          .addTextDisplayComponents((text) =>
            text.setContent("## ❌ Cannot unban yourself")
          )
          .addSeparatorComponents((sep) => sep.setDivider(true))
          .addTextDisplayComponents((text) =>
            text.setContent(joker.unbanSelfFailure("user"))
          ),
      };
    }

    // Check if user is trying to ban the bot
    if (targetUser.id === interaction.client.user?.id) {
      return {
        isValid: false,
        errorContainer: new ContainerBuilder()
          .addTextDisplayComponents((text) =>
            text.setContent("## ✅ Unbanned Successful")
          )
          .addSeparatorComponents((sep) => sep.setDivider(true))
          .addTextDisplayComponents((text) =>
            text.setContent(
              "Did you really expect this to work? How would I unban myself from a server I'm banned in..."
            )
          ),
      };
    }

    // Try to get member
    let member: GuildMember | null = null;
    try {
      member = await interaction.guild!.members.fetch(targetUser.id);
    } catch {
      // User is not in the server, that's fine for banning
    }

    // Check if member can be banned
    if (member && !member.bannable) {
      return {
        isValid: false,
        errorContainer: new ContainerBuilder()
          .addTextDisplayComponents((text) =>
            text.setContent("## ❌ Cannot Unban User")
          )
          .addSeparatorComponents((sep) => sep.setDivider(true))
          .addTextDisplayComponents((text) =>
            text.setContent(
              "I cannot ban this user. They may have higher permissions than me or be the server owner."
            )
          ),
      };
    }

    return {
      isValid: true,
      member,
    };
  }

  private async executeUnban(
    interaction: Interaction,
    targetUser: any,
    reason: string
  ): Promise<void> {
    const { id: caseUuid, caseId } = await generateUniqueCaseId();

    // Execute the unban
    await interaction.guild!.members.unban(
      targetUser.id,
      `${reason} | Case: ${caseId} | Moderator: ${interaction.user.username}`
    );

    // Ensure guild exists in database
    await ensureGuildExists(
      interaction.guild!.id,
      interaction.guild!.name,
      interaction.guild!.ownerId
    );

    // Store users and create case
    await storeUser(targetUser);
    await storeUser(interaction.user);

    // Create moderation case
    await Database.insert(moderationCases).values({
      id: caseUuid,
      caseId: caseId,
      guildId: interaction.guild!.id,
      type: "unban",
      userId: targetUser.id,
      moderatorId: interaction.user.id,
      reason: reason,
      evidence: [],
      attachments: [],
    });

    // Send success response
    await this.sendSuccessResponse(
      interaction as ChatInputCommandInteraction,
      targetUser,
      reason,
      caseId
    );
  }

  private async sendSuccessResponse(
    interaction: ChatInputCommandInteraction,
    targetUser: any,
    reason: string,
    caseId: string
  ): Promise<void> {
    const resultContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent("## ✅ User Unbanned Successfully")
      )
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(`**Case ID:** ${caseId}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**User:** ${targetUser.username} (${targetUser.id})`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Moderator:** ${interaction.user.username}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Reason:** ${reason}`)
      );

    await interaction.reply({
      components: [resultContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  private async sendErrorResponse(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) => text.setContent("## ❌ Ban Failed"))
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent("An error occurred while trying to ban the user.")
      )
      .addTextDisplayComponents((text) =>
        text.setContent("Please check my permissions and try again.")
      );

    await interaction.reply({
      components: [errorContainer],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  }
}

export default UnbanCommand;
