# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2025-08-10

### 💥 BREAKING CHANGES

- **Project rebranded from Solara to Elara** - Complete identity change including package name, bot name, and all references

### ✨ Features

- **Core Bot Architecture**: Complete rewrite with modern TypeScript architecture

  - ExtendedClient with command collection and database integration
  - Automatic command and event registration system
  - Proper error handling and logging throughout
  - Discord gateway intents configured for full functionality

- **Database Integration**: Comprehensive PostgreSQL integration with DrizzleORM

  - Guild management with settings and member tracking
  - Moderation actions logging (kick, ban, timeout, warn)
  - Auto-moderation rules system
  - Type-safe database operations with full schema definitions

- **Type System Foundation**: Complete TypeScript type safety

  - Command interface for slash command structure
  - Event interface for Discord event handling
  - ExtendedClient interface with database integration
  - Full type safety across entire codebase

- **Discord Event System**: Modern event handling architecture

  - Ready event with bot initialization
  - Interaction handler for slash commands
  - Guild join event with database preparation
  - Comprehensive error handling for all interactions

- **Core Commands**: Modern Discord Components v2 implementation

  - `/ping` - System stats with realistic memory monitoring and color-coded progress bars
  - `/kick` - Member moderation with DM notifications and permission handling
  - `/calculate` - Safe expression evaluation with input sanitization

- **Intelligent Command Deployment**: Smart command synchronization system

  - Deep comparison to detect actual command changes
  - Handles Discord's automatic default value assignment
  - Prevents unnecessary API calls with intelligent diffing
  - Supports both global and guild-specific commands
  - Comprehensive logging and deployment analysis

- **Utility System**: Reusable components and safety functions
  - Progress bar components with color coding
  - Input sanitization for safe expression evaluation
  - Error handling with Discord Components v2
  - Modular utility functions

### 📚 Documentation

- **Complete README rewrite**: Comprehensive setup and development guide
  - Modern project description with feature highlights
  - Detailed prerequisites and setup instructions
  - Project structure documentation
  - Development workflow guides for commands and events
  - Database setup and migration instructions

### 🔧 Configuration

- **Environment Configuration**: Complete environment setup

  - `.env.example` with all required variables (TOKEN, CLIENT_ID, DATABASE_URL, etc.)
  - `drizzle.config.ts` for database schema management
  - PostgreSQL connection and migration settings

- **Development Dependencies**: Modern development toolchain
  - DrizzleORM and PostgreSQL support
  - TypeScript build tools (tsc-alias, tsx)
  - Path resolution with tsconfig-paths
  - Hot reload development environment

### 🛠️ Development Experience

- **Build System**: Complete development workflow

  - `pnpm dev` - Development mode with hot reload
  - `pnpm build` - Production build with alias transformation
  - `pnpm start` - Production runtime
  - `pnpm refresh` - Intelligent command deployment

- **Database Workflow**: Complete database management
  - `pnpm db:generate` - Schema generation
  - `pnpm db:migrate` - Migration execution
  - `pnpm db:studio` - Database studio interface

### 🏗️ Architecture

- **Modern Stack**:
  - TypeScript for full type safety
  - Discord.js v14 with Components v2
  - DrizzleORM with PostgreSQL
  - Path aliases for clean imports
  - Modular event and command architecture

### 📦 Dependencies

- **Added**: `drizzle-orm@^0.44.4`, `pg@^8.16.3`, `tsconfig-paths@^4.2.0`
- **Added Dev**: `@types/pg@^8.15.5`, `drizzle-kit@^0.31.4`, `tsc-alias@^1.8.16`, `tsx@^4.20.3`

## [1.0.0] - 2025-08-09

### Added

- Initial project structure with essential files and configurations ([bea2094](https://github.com/NotKeira/solara/commit/bea2094b408852af5649ac010a5711b9f281ddd5))
- Apache License 2.0 to the project ([87ad284](https://github.com/NotKeira/solara/commit/87ad284e77116578b2896b2a5d6886e825e6d234))

### Changed

- Remove changelog script and associated CLI entry point ([58c10a3](https://github.com/NotKeira/solara/commit/58c10a3c6f4c5690b5675098b1754de5b3c74721))
- Update project description in package.json for clarity ([9b392bc](https://github.com/NotKeira/solara/commit/9b392bc56f3e0203484d46fc6c9a047145a9b4ce))
- Update project metadata in package.json and enhance changelog ([ad3239e](https://github.com/NotKeira/solara/commit/ad3239e0903836db61db5bb7a08c16224c5769cf))
