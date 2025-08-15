import type { Command } from "@/types";
import {
  ApplicationIntegrationType,
  ContainerBuilder,
  Interaction,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { Database } from "@/database";
import { moderationCases, users } from "@/database/schema";
import { eq, and, desc, count, or, sql } from "drizzle-orm";
import { findCaseByIdInGuild, isValidCaseId } from "@/utils/case-management";

export class CaseCommand implements Command {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder =
    new SlashCommandBuilder()
      .setName("case")
      .setDescription("Manage moderation cases")
      .setContexts(InteractionContextType.Guild)
      .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addSubcommand((subcommand) =>
        subcommand
          .setName("info")
          .setDescription("View detailed information about a case")
          .addStringOption((option) =>
            option
              .setName("case_id")
              .setDescription("The case ID to view")
              .setRequired(true)
              .setMaxLength(10)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("list")
          .setDescription("List moderation cases with filters")
          .addUserOption((option) =>
            option
              .setName("user")
              .setDescription("Filter by user")
              .setRequired(false)
          )
          .addStringOption((option) =>
            option
              .setName("type")
              .setDescription("Filter by case type")
              .setRequired(false)
              .addChoices(
                { name: "Ban", value: "ban" },
                { name: "Kick", value: "kick" },
                { name: "Timeout", value: "timeout" },
                { name: "Warning", value: "warn" },
                { name: "Note", value: "note" },
                { name: "Unban", value: "unban" },
                { name: "Untimeout", value: "untimeout" }
              )
          )
          .addUserOption((option) =>
            option
              .setName("moderator")
              .setDescription("Filter by moderator")
              .setRequired(false)
          )
          .addStringOption((option) =>
            option
              .setName("status")
              .setDescription("Filter by case status")
              .setRequired(false)
              .addChoices(
                { name: "Active", value: "active" },
                { name: "Closed", value: "closed" },
                { name: "Appealed", value: "appealed" }
              )
          )
          .addIntegerOption((option) =>
            option
              .setName("limit")
              .setDescription("Number of cases to show (default: 10, max: 25)")
              .setRequired(false)
              .setMinValue(1)
              .setMaxValue(25)
          )
          .addIntegerOption((option) =>
            option
              .setName("page")
              .setDescription("Page number (default: 1)")
              .setRequired(false)
              .setMinValue(1)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("search")
          .setDescription("Search cases by user ID, case ID, or reason")
          .addStringOption((option) =>
            option
              .setName("query")
              .setDescription(
                "Search query (user ID, case ID, or text in reason)"
              )
              .setRequired(true)
              .setMaxLength(100)
          )
          .addIntegerOption((option) =>
            option
              .setName("limit")
              .setDescription(
                "Number of results to show (default: 10, max: 25)"
              )
              .setRequired(false)
              .setMinValue(1)
              .setMaxValue(25)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("close")
          .setDescription("Close an active case")
          .addStringOption((option) =>
            option
              .setName("case_id")
              .setDescription("The case ID to close")
              .setRequired(true)
              .setMaxLength(10)
          )
          .addStringOption((option) =>
            option
              .setName("reason")
              .setDescription("Reason for closing the case")
              .setRequired(false)
              .setMaxLength(500)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("update")
          .setDescription("Update a case's reason or notes")
          .addStringOption((option) =>
            option
              .setName("case_id")
              .setDescription("The case ID to update")
              .setRequired(true)
              .setMaxLength(10)
          )
          .addStringOption((option) =>
            option
              .setName("field")
              .setDescription("Field to update")
              .setRequired(true)
              .addChoices(
                { name: "Reason", value: "reason" },
                { name: "Notes", value: "notes" }
              )
          )
          .addStringOption((option) =>
            option
              .setName("value")
              .setDescription("New value for the field")
              .setRequired(true)
              .setMaxLength(1000)
          )
          .addStringOption((option) =>
            option
              .setName("update_reason")
              .setDescription("Reason for this update")
              .setRequired(false)
              .setMaxLength(500)
          )
      );

  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand() || !interaction.guild) return;

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "info":
        await this.handleInfo(interaction);
        break;
      case "list":
        await this.handleList(interaction);
        break;
      case "search":
        await this.handleSearch(interaction);
        break;
      case "close":
        await this.handleClose(interaction);
        break;
      case "update":
        await this.handleUpdate(interaction);
        break;
    }
  }

  private async handleInfo(interaction: any): Promise<void> {
    const caseId = interaction.options.getString("case_id").toUpperCase();

    if (!isValidCaseId(caseId)) {
      await this.sendInvalidCaseIdError(interaction);
      return;
    }

    try {
      // For now, just search within the guild (removing global search complexity)
      const moderationCase = await findCaseByIdInGuild(
        interaction.guild.id,
        caseId
      );

      if (!moderationCase) {
        await this.sendCaseNotFoundError(interaction, caseId);
        return;
      }

      await this.displayCaseInfo(interaction, moderationCase);
    } catch (error) {
      console.error("Error fetching case info:", error);
      await this.sendDatabaseError(
        interaction,
        "Unable to fetch case information. Please try again later."
      );
    }
  }

  private async sendDatabaseError(
    interaction: any,
    message: string
  ): Promise<void> {
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent("## ❌ Database Error")
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Error:** ${message}`)
      );

    await interaction.reply({
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  }

  private async sendInvalidCaseIdError(interaction: any): Promise<void> {
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent("## ❌ Invalid Case ID")
      )
      .addTextDisplayComponents((text) =>
        text.setContent(
          "**Error:** Case ID must be exactly 10 characters using only numbers and letters (excluding 0, 1, I, O)"
        )
      );

    await interaction.reply({
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  }

  private async sendCaseNotFoundError(
    interaction: any,
    caseId: string
  ): Promise<void> {
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent("## ❌ Case Not Found")
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`**Error:** No case found with ID \`${caseId}\``)
      );

    await interaction.reply({
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  }

  private async displayCaseInfo(
    interaction: any,
    moderationCase: any
  ): Promise<void> {
    // Get user and moderator info
    const [targetUser, moderatorUser] = await Promise.all([
      this.getUserInfo(moderationCase.userId),
      this.getUserInfo(moderationCase.moderatorId),
    ]);

    const caseContainer = this.buildBasicCaseInfo(
      moderationCase,
      targetUser,
      moderatorUser
    );
    this.addDurationInfo(caseContainer, moderationCase);
    this.addStatusInfo(caseContainer, moderationCase);
    this.addAppealInfo(caseContainer, moderationCase);
    this.addEvidenceInfo(caseContainer, moderationCase);
    this.addNotesInfo(caseContainer, moderationCase);

    await interaction.reply({
      components: [caseContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  private buildBasicCaseInfo(
    moderationCase: any,
    targetUser: any,
    moderatorUser: any
  ): ContainerBuilder {
    return new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(`## 📋 Case ${moderationCase.caseId}`)
      )
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent(`**Type:** ${this.formatCaseType(moderationCase.type)}`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**User:** ${targetUser?.username || "Unknown User"} (\`${
            moderationCase.userId
          }\`)`
        )
      )
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**Moderator:** ${
            moderatorUser?.username || "Unknown Moderator"
          } (\`${moderationCase.moderatorId}\`)`
        )
      )
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**Created:** <t:${Math.floor(
            new Date(moderationCase.createdAt).getTime() / 1000
          )}:F>`
        )
      );
  }

  private addDurationInfo(
    container: ContainerBuilder,
    moderationCase: any
  ): void {
    if (moderationCase.reason) {
      container.addTextDisplayComponents((text) =>
        text.setContent(`**Reason:** ${moderationCase.reason}`)
      );
    }

    if (
      moderationCase.duration &&
      typeof moderationCase.duration === "number"
    ) {
      const expiry = new Date(
        new Date(moderationCase.createdAt).getTime() + moderationCase.duration
      );
      container.addTextDisplayComponents((text) =>
        text.setContent(
          `**Duration:** ${this.formatDuration(moderationCase.duration)}`
        )
      );
      container.addTextDisplayComponents((text) =>
        text.setContent(
          `**Expires:** <t:${Math.floor(expiry.getTime() / 1000)}:F>`
        )
      );
    }
  }

  private addStatusInfo(
    container: ContainerBuilder,
    moderationCase: any
  ): void {
    container.addSeparatorComponents((sep) => sep.setDivider(true));

    let status = "⏸️ Inactive";
    if (moderationCase.closed) {
      status = "🔒 Closed";
    } else if (moderationCase.active) {
      status = "🟢 Active";
    }

    container.addTextDisplayComponents((text) =>
      text.setContent(`**Status:** ${status}`)
    );

    if (moderationCase.closed && moderationCase.closedAt) {
      container.addTextDisplayComponents((text) =>
        text.setContent(
          `**Closed:** <t:${Math.floor(
            new Date(moderationCase.closedAt as Date).getTime() / 1000
          )}:F>`
        )
      );
      if (moderationCase.closeReason) {
        container.addTextDisplayComponents((text) =>
          text.setContent(`**Close Reason:** ${moderationCase.closeReason}`)
        );
      }
    }
  }

  private addAppealInfo(
    container: ContainerBuilder,
    moderationCase: any
  ): void {
    if (!moderationCase.appealed) return;

    container
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) =>
        text.setContent("## 📝 Appeal Information")
      );

    if (moderationCase.appealedAt) {
      container.addTextDisplayComponents((text) =>
        text.setContent(
          `**Appealed:** <t:${Math.floor(
            new Date(moderationCase.appealedAt as Date).getTime() / 1000
          )}:F>`
        )
      );
    }

    if (moderationCase.appealReason) {
      container.addTextDisplayComponents((text) =>
        text.setContent(`**Appeal Reason:** ${moderationCase.appealReason}`)
      );
    }

    if (moderationCase.appealDecision) {
      let decisionEmoji = "⏳";
      if (moderationCase.appealDecision === "approved") {
        decisionEmoji = "✅";
      } else if (moderationCase.appealDecision === "denied") {
        decisionEmoji = "❌";
      }

      const decisionText =
        moderationCase.appealDecision.charAt(0).toUpperCase() +
        moderationCase.appealDecision.slice(1);
      container.addTextDisplayComponents((text) =>
        text.setContent(`**Appeal Status:** ${decisionEmoji} ${decisionText}`)
      );
    }
  }

  private addEvidenceInfo(
    container: ContainerBuilder,
    moderationCase: any
  ): void {
    if (
      !moderationCase.evidence ||
      !Array.isArray(moderationCase.evidence) ||
      moderationCase.evidence.length === 0
    ) {
      return;
    }

    container
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) => text.setContent("## 🔍 Evidence"));

    moderationCase.evidence
      .slice(0, 3)
      .forEach((evidence: string, index: number) => {
        container.addTextDisplayComponents((text) =>
          text.setContent(`**${index + 1}.** ${evidence}`)
        );
      });

    if (moderationCase.evidence.length > 3) {
      container.addTextDisplayComponents((text) =>
        text.setContent(`*...and ${moderationCase.evidence.length - 3} more*`)
      );
    }
  }

  private addNotesInfo(container: ContainerBuilder, moderationCase: any): void {
    if (!moderationCase.notes) return;

    container
      .addSeparatorComponents((sep) => sep.setDivider(true))
      .addTextDisplayComponents((text) => text.setContent("## 📝 Notes"))
      .addTextDisplayComponents((text) =>
        text.setContent(moderationCase.notes)
      );
  }

  private async handleList(interaction: any): Promise<void> {
    const filters = this.buildListFilters(interaction);
    const limit = Math.min(interaction.options.getInteger("limit") || 10, 25);
    const page = interaction.options.getInteger("page") || 1;
    const offset = (page - 1) * limit;

    try {
      const conditions = this.buildWhereConditions(interaction);
      const totalCount = await this.getTotalCaseCount(conditions);
      const cases = await this.getCasesList(conditions, limit, offset);

      if (cases.length === 0) {
        await this.sendEmptyListResponse(interaction);
        return;
      }

      await this.sendCasesList(
        interaction,
        cases,
        filters,
        page,
        totalCount,
        limit
      );
    } catch (error) {
      console.error("Error listing cases:", error);
      await this.sendDatabaseError(
        interaction,
        "Unable to fetch case list. Please try again later."
      );
    }
  }

  private buildListFilters(interaction: any): string[] {
    const filters: string[] = [];
    const user = interaction.options.getUser("user");
    const type = interaction.options.getString("type");
    const moderator = interaction.options.getUser("moderator");
    const status = interaction.options.getString("status");

    if (user) filters.push(`User: ${user.username}`);
    if (type) filters.push(`Type: ${type}`);
    if (moderator) filters.push(`Moderator: ${moderator.username}`);
    if (status) filters.push(`Status: ${status}`);

    return filters;
  }

  private buildWhereConditions(interaction: any): any[] {
    const conditions = [eq(moderationCases.guildId, interaction.guild.id)];
    const user = interaction.options.getUser("user");
    const type = interaction.options.getString("type");
    const moderator = interaction.options.getUser("moderator");
    const status = interaction.options.getString("status");

    if (user) {
      conditions.push(eq(moderationCases.userId, user.id));
    }

    if (type) {
      conditions.push(eq(moderationCases.type, type));
    }

    if (moderator) {
      conditions.push(eq(moderationCases.moderatorId, moderator.id));
    }

    if (status) {
      switch (status) {
        case "active":
          conditions.push(eq(moderationCases.closed, false));
          break;
        case "closed":
          conditions.push(eq(moderationCases.closed, true));
          break;
        case "appealed":
          conditions.push(eq(moderationCases.appealed, true));
          break;
      }
    }

    return conditions;
  }

  private async getTotalCaseCount(conditions: any[]): Promise<number> {
    const totalCountResult = await Database.select({ count: count() })
      .from(moderationCases)
      .where(and(...conditions));

    return totalCountResult[0]?.count || 0;
  }

  private async getCasesList(
    conditions: any[],
    limit: number,
    offset: number
  ): Promise<any[]> {
    return await Database.select()
      .from(moderationCases)
      .where(and(...conditions))
      .orderBy(desc(moderationCases.createdAt))
      .limit(limit)
      .offset(offset);
  }

  private async sendEmptyListResponse(interaction: any): Promise<void> {
    const emptyContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent("## 📋 No Cases Found")
      )
      .addTextDisplayComponents((text) =>
        text.setContent("No cases match the specified filters.")
      );

    await interaction.reply({
      components: [emptyContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  private async sendCasesList(
    interaction: any,
    cases: any[],
    filters: string[],
    page: number,
    totalCount: number,
    limit: number
  ): Promise<void> {
    const totalPages = Math.ceil(totalCount / limit);
    const hasFilters = filters.length > 0;

    const listContainer = new ContainerBuilder().addTextDisplayComponents(
      (text) => {
        const title = hasFilters
          ? "## 📋 Moderation Cases (Filtered)"
          : "## 📋 Moderation Cases";
        return text.setContent(title);
      }
    );

    if (hasFilters) {
      listContainer.addTextDisplayComponents((text) =>
        text.setContent(`**Filters:** ${filters.join(", ")}`)
      );
    }

    listContainer
      .addTextDisplayComponents((text) =>
        text.setContent(
          `**Page ${page} of ${totalPages}** (${totalCount} total cases)`
        )
      )
      .addSeparatorComponents((sep) => sep.setDivider(true));

    // Add cases
    for (const moderationCase of cases) {
      this.addCaseToList(listContainer, moderationCase);
    }

    if (totalPages > 1) {
      listContainer
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((text) =>
          text.setContent(
            `Use \`/case list\` with \`page:${page + 1}\` to see more results`
          )
        );
    }

    await interaction.reply({
      components: [listContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  private addCaseToList(
    container: ContainerBuilder,
    moderationCase: any
  ): void {
    const caseDate = new Date(moderationCase.createdAt);

    let statusIcon = "⏸️";
    if (moderationCase.closed) {
      statusIcon = "🔒";
    } else if (moderationCase.active) {
      statusIcon = "🟢";
    }

    container.addTextDisplayComponents((text) =>
      text.setContent(
        `${statusIcon} **${moderationCase.caseId}** - ${this.formatCaseType(
          moderationCase.type
        )} | <t:${Math.floor(caseDate.getTime() / 1000)}:R>`
      )
    );

    if (moderationCase.reason) {
      const shortReason =
        moderationCase.reason.length > 100
          ? moderationCase.reason.substring(0, 100) + "..."
          : moderationCase.reason;
      container.addTextDisplayComponents((text) =>
        text.setContent(`   ${shortReason}`)
      );
    }
  }

  private async handleSearch(interaction: any): Promise<void> {
    const query = interaction.options.getString("query");
    const limit = Math.min(interaction.options.getInteger("limit") || 10, 25);

    try {
      const cases: any[] = await this.searchCases(
        interaction.guild.id,
        query,
        limit
      );

      if (cases.length === 0) {
        await this.sendNoSearchResults(interaction, query);
        return;
      }

      await this.sendSearchResults(interaction, cases, query);
    } catch (error) {
      console.error("Error searching cases:", error);
      await this.sendDatabaseError(
        interaction,
        "Unable to search cases. Please try again later."
      );
    }
  }

  private async searchCases(
    guildId: string,
    query: string,
    limit: number
  ): Promise<any[]> {
    // Check if it's a case ID search
    if (isValidCaseId(query)) {
      const caseResult = await findCaseByIdInGuild(guildId, query);
      return caseResult ? [caseResult] : [];
    } else {
      // Search by user ID or reason text
      return await Database.select()
        .from(moderationCases)
        .where(
          and(
            eq(moderationCases.guildId, guildId),
            or(
              eq(moderationCases.userId, query),
              sql`${moderationCases.reason} ILIKE ${"%" + query + "%"}`
            )
          )
        )
        .orderBy(desc(moderationCases.createdAt))
        .limit(limit);
    }
  }

  private async sendNoSearchResults(
    interaction: any,
    query: string
  ): Promise<void> {
    const emptyContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent("## 🔍 No Results Found")
      )
      .addTextDisplayComponents((text) =>
        text.setContent(`No cases found matching "${query}"`)
      );

    await interaction.reply({
      components: [emptyContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  private async sendSearchResults(
    interaction: any,
    cases: any[],
    query: string
  ): Promise<void> {
    const searchContainer = new ContainerBuilder()
      .addTextDisplayComponents((text) =>
        text.setContent(`## 🔍 Search Results for "${query}"`)
      )
      .addTextDisplayComponents((text) =>
        text.setContent(
          `Found ${cases.length} case${cases.length === 1 ? "" : "s"}`
        )
      )
      .addSeparatorComponents((sep) => sep.setDivider(true));

    // Add cases
    for (const moderationCase of cases) {
      this.addCaseToList(searchContainer, moderationCase);
    }

    await interaction.reply({
      components: [searchContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  private async handleClose(interaction: any): Promise<void> {
    const caseId = interaction.options.getString("case_id").toUpperCase();
    const reason =
      interaction.options.getString("reason") || "No reason provided";

    if (!isValidCaseId(caseId)) {
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent("## ❌ Invalid Case ID")
        )
        .addTextDisplayComponents((text) =>
          text.setContent(
            "**Error:** Case ID must be exactly 10 characters using only numbers and letters (excluding 0, 1, I, O)"
          )
        );

      await interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const moderationCase = await findCaseByIdInGuild(
        interaction.guild.id,
        caseId
      );

      if (!moderationCase) {
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents((text) =>
            text.setContent("## ❌ Case Not Found")
          )
          .addTextDisplayComponents((text) =>
            text.setContent(`**Error:** No case found with ID \`${caseId}\``)
          );

        await interaction.reply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
        return;
      }

      if (moderationCase.closed) {
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents((text) =>
            text.setContent("## ❌ Case Already Closed")
          )
          .addTextDisplayComponents((text) =>
            text.setContent(`**Error:** Case \`${caseId}\` is already closed`)
          );

        await interaction.reply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
        return;
      }

      // Close the case
      await Database.update(moderationCases)
        .set({
          closed: true,
          closedAt: new Date(),
          closedBy: interaction.user.id,
          closeReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(moderationCases.id, moderationCase.id));

      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent("## ✅ Case Closed Successfully")
        )
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((text) =>
          text.setContent(`**Case ID:** ${caseId}`)
        )
        .addTextDisplayComponents((text) =>
          text.setContent(`**Closed by:** ${interaction.user.username}`)
        )
        .addTextDisplayComponents((text) =>
          text.setContent(`**Reason:** ${reason}`)
        );

      await interaction.reply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      console.error("Error closing case:", error);

      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent("## ❌ Database Error")
        )
        .addTextDisplayComponents((text) =>
          text.setContent(
            "**Error:** Unable to close case. Please try again later."
          )
        );

      await interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
    }
  }

  private async handleUpdate(interaction: any): Promise<void> {
    const caseId = interaction.options.getString("case_id").toUpperCase();
    const field = interaction.options.getString("field");
    const value = interaction.options.getString("value");
    const updateReason =
      interaction.options.getString("update_reason") || "No reason provided";

    if (!isValidCaseId(caseId)) {
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent("## ❌ Invalid Case ID")
        )
        .addTextDisplayComponents((text) =>
          text.setContent(
            "**Error:** Case ID must be exactly 10 characters using only numbers and letters (excluding 0, 1, I, O)"
          )
        );

      await interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const moderationCase = await findCaseByIdInGuild(
        interaction.guild.id,
        caseId
      );

      if (!moderationCase) {
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents((text) =>
            text.setContent("## ❌ Case Not Found")
          )
          .addTextDisplayComponents((text) =>
            text.setContent(`**Error:** No case found with ID \`${caseId}\``)
          );

        await interaction.reply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
        return;
      }

      if (moderationCase.closed) {
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents((text) =>
            text.setContent("## ❌ Cannot Update Closed Case")
          )
          .addTextDisplayComponents((text) =>
            text.setContent(
              `**Error:** Cannot update closed case \`${caseId}\``
            )
          );

        await interaction.reply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
        return;
      }

      const oldValue =
        field === "reason" ? moderationCase.reason : moderationCase.notes;

      // Update the case
      const updateData: any = { updatedAt: new Date() };
      updateData[field] = value;

      await Database.update(moderationCases)
        .set(updateData)
        .where(eq(moderationCases.id, moderationCase.id));

      // Log the update (you can implement this in caseUpdates table if needed)

      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent("## ✅ Case Updated Successfully")
        )
        .addSeparatorComponents((sep) => sep.setDivider(true))
        .addTextDisplayComponents((text) =>
          text.setContent(`**Case ID:** ${caseId}`)
        )
        .addTextDisplayComponents((text) =>
          text.setContent(
            `**Field:** ${field.charAt(0).toUpperCase() + field.slice(1)}`
          )
        )
        .addTextDisplayComponents((text) =>
          text.setContent(`**Old Value:** ${oldValue || "*(empty)*"}`)
        )
        .addTextDisplayComponents((text) =>
          text.setContent(`**New Value:** ${value}`)
        )
        .addTextDisplayComponents((text) =>
          text.setContent(`**Updated by:** ${interaction.user.username}`)
        )
        .addTextDisplayComponents((text) =>
          text.setContent(`**Reason:** ${updateReason}`)
        );

      await interaction.reply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      console.error("Error updating case:", error);

      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents((text) =>
          text.setContent("## ❌ Database Error")
        )
        .addTextDisplayComponents((text) =>
          text.setContent(
            "**Error:** Unable to update case. Please try again later."
          )
        );

      await interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
    }
  }

  private async getUserInfo(userId: string) {
    try {
      const user = await Database.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return user[0] || null;
    } catch (error) {
      console.error("Error fetching user info:", error);
      return null;
    }
  }

  private formatCaseType(type: string): string {
    const typeMap: Record<string, string> = {
      ban: "🔨 Ban",
      kick: "👢 Kick",
      timeout: "⏰ Timeout",
      warn: "⚠️ Warning",
      note: "📝 Note",
      unban: "🔓 Unban",
      untimeout: "🔊 Untimeout",
      massban: "🔨 Mass Ban",
      masskick: "👢 Mass Kick",
      masswarn: "⚠️ Mass Warning",
      massmute: "🔇 Mass Mute",
    };

    return typeMap[type] || type;
  }

  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days === 1 ? "" : "s"}`;
    } else if (hours > 0) {
      return `${hours} hour${hours === 1 ? "" : "s"}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes === 1 ? "" : "s"}`;
    } else {
      return `${seconds} second${seconds === 1 ? "" : "s"}`;
    }
  }
}

export default CaseCommand;
