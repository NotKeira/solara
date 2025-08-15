# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.2.0] - 2025-08-15

### ✨ Features

- **Comprehensive Utility Command Suite**: 8 new utility commands with Discord Components v2

  - `/avatar [user]` - Display user avatars with guild-specific and global options
  - `/userinfo <user>` - Detailed user information with account creation date, badges, and server join details
  - `/serverinfo` - Complete server statistics including member counts, creation date, features, and boost status
  - `/random <min> <max>` - Cryptographically secure random number generation with range validation
  - `/base64 <encode|decode> <text>` - Base64 encoding/decoding with error handling for invalid input
  - `/hash <algorithm> <text>` - Multiple hash algorithms (MD5, SHA1, SHA256, SHA512) with hex output
  - `/color <hex>` - Color information display with RGB conversion and visual color preview
  - `/uuid [version]` - UUID generation supporting v1, v4, and v7 with format validation

- **Advanced Case Management System**: Complete moderation case tracking

  - `/case <view|list|search|edit|delete>` - Comprehensive case management interface
  - **Case View**: Individual case details with evidence, attachments, and timeline
  - **Case List**: Paginated case browsing with filtering by moderator, user, or type
  - **Case Search**: Advanced search with text queries across reasons and evidence
  - **Case Edit**: Modify case reasons with audit trail and moderator tracking
  - **Case Delete**: Secure case deletion with confirmation prompts
  - Unique alphanumeric case IDs (e.g., "A1B2C3") for easy reference
  - UUID-based internal tracking with database relationships

- **Enhanced Moderation Commands**: Complete moderation overhaul with case integration

  - **Updated Ban/Kick/Warn/Timeout**: All moderation commands now create case records
  - **Case ID Integration**: Every moderation action generates trackable case with unique ID
  - **User Notification System**: DM notifications include case IDs for appeals
  - **Database Integration**: Proper foreign key relationships with guilds and users
  - **Shared Utilities**: Centralized guild and user management functions
  - **Evidence Tracking**: Support for evidence attachments and detailed reasoning

### 🔧 Infrastructure Improvements

- **Shared Moderation Utilities**: Centralized database operations

  - `ensureGuildExists()` - Automatic guild registration with conflict handling
  - `storeUser()` - User profile management with update-on-conflict
  - `generateUniqueCaseId()` - Collision-resistant case ID generation
  - Foreign key constraint handling for data integrity

- **Enhanced Command Deployment**: Improved change detection system

  - **Hash Command Fix**: Resolved false positive deployment updates
  - **Option Normalization**: Consistent required field handling across all commands
  - **JSON Comparison**: Accurate change detection using string comparison
  - **Detailed Logging**: Comprehensive deployment analysis and change reporting

- **ES Module Compatibility**: Fixed module system issues
  - **Joke Generator**: Replaced `__dirname` with `process.cwd()` fallback for ES modules
  - **Path Resolution**: Improved file system access in ES module environment
  - **Build Compatibility**: Ensured clean builds across development and production

### 🛠️ Technical Improvements

- **Database Schema Evolution**: Enhanced moderation case tracking

  - **Foreign Key Constraints**: Proper relationships between cases, guilds, and users
  - **Case Metadata**: Evidence arrays, attachment tracking, and audit trails
  - **Index Optimization**: Efficient querying for case management operations

- **Type Safety Enhancements**: Comprehensive TypeScript integration

  - **Command Interface**: Consistent typing across all new commands
  - **Database Operations**: Type-safe Drizzle ORM integration throughout
  - **Error Handling**: Proper error types and exception management

- **Code Quality**: Consistent patterns and best practices
  - **Linting Compliance**: All commands pass ESLint cognitive complexity rules
  - **Error Boundaries**: Comprehensive error handling with user-friendly messages
  - **Validation**: Input sanitization and Discord API error handling
  - **Documentation**: Inline code documentation and clear function signatures

### 🐛 Bug Fixes

- **Command Deployment**: Fixed hash command repeatedly deploying without changes
- **Module Resolution**: Resolved ES module compatibility issues in utilities
- **Database Constraints**: Fixed foreign key constraint violations in moderation system
- **Type Assertions**: Removed unnecessary non-null assertions for cleaner code

### 📚 Documentation

- **Code Comments**: Enhanced inline documentation for complex operations
- **Type Definitions**: Clear interfaces and type exports for all new functionality
- **Error Messages**: User-friendly error messages with actionable guidance

## [2.1.1] - 2025-08-11

### ✨ Features

- **Memory Command**: Added comprehensive memory analysis command
  - `/memory` - Detailed memory usage analysis with heap statistics
  - Real-time memory profiling with RSS, heap used, heap total, and external memory
  - Color-coded progress bars for visual memory usage representation
  - Percentage-based memory usage indicators for better monitoring

### ⚡ Performance Improvements

- **Memory Optimization**: Significant reduction in bot memory usage

  - Implemented lazy loading for timezone data structures (loads on-demand vs. statically)
  - Removed debug logging that was consuming memory and CPU cycles
  - Optimized Discord.js intents (removed unnecessary `MessageContent` and `GuildMessages`)
  - Added Node.js memory optimization flags (`--max-old-space-size=512`, `--max-semi-space-size=16`, `--optimize-for-size`)
  - Enhanced systemd service configuration with memory limits and production optimizations
  - Improved autocomplete performance with score-based filtering algorithms

- **Resource Efficiency**: Reduced memory footprint
  - Lazy-loaded country timezone mappings save ~10-15MB of static data
  - Optimized V8 garbage collection with `--gc-interval=2000`
  - Reduced thread pool size with `UV_THREADPOOL_SIZE=4`
  - Production environment optimizations with `NODE_ENV=production`

### 🛠️ Technical Improvements

- Enhanced timezone filtering functions with intelligent scoring system
- Improved autocomplete responsiveness for timezone and country searches
- Optimized service startup configuration for production deployment
- Enhanced timezone and country filtering with improved autocomplete functionality
- Added debugging logs for better development experience
- Improved memory profiling utilities for better resource monitoring

## [2.1.0] - 2025-08-10

### ✨ Features

- **Timezone Command System**: Complete timezone management for users

  - `/timezone set <timezone> [user]` - Set timezone for yourself or another user (admin only)
  - `/timezone get <user>` - Get a user's timezone and current time
  - `/timezone find <country>` - Find timezones for a specific country
  - Full autocomplete support for countries and IANA timezone identifiers
  - Integration with `date-fns-tz` for accurate timezone handling
  - Timezone data stored directly in user profiles for efficiency

- **Enhanced Database Schema**: Complete database architecture redesign

  - **User-Centric Design**: `users` table as core entity with timezone field
  - **Comprehensive Guild System**: Enhanced guild tracking with settings, members, and permissions
  - **Advanced Moderation**: Separate warnings table, appeals system, evidence tracking
  - **Auto-Moderation Framework**: Configurable rules with exemptions and thresholds
  - **Performance Optimizations**: Strategic database indexes for frequent queries
  - **Data Integrity**: Proper foreign key relationships and cascade deletes

- **Timezone Utilities**: Robust timezone handling infrastructure
  - IANA timezone validation and formatting
  - Country-to-timezone mappings for 195+ countries
  - Common timezone presets for quick access
  - Time formatting in user's preferred timezone
  - Smart autocomplete with fuzzy matching

### 🔧 Database Improvements

- **Schema Organization**: Clean, well-documented schema with logical sections

  - Core User System with timezone and locale preferences
  - Guild System with comprehensive settings and member tracking
  - Moderation System with appeals and evidence tracking
  - Auto-Moderation System with configurable rules and exemptions

- **Type Safety**: Complete TypeScript integration
  - Drizzle ORM type inference for all tables
  - Proper `Select` and `Insert` types exported
  - Type-safe database operations throughout codebase

### 📦 Dependencies

- **Added**: `date-fns-tz@^3.2.0` for timezone handling

### 🛠️ Technical Improvements

- **Database Connection**: Enhanced error handling and connection management
- **Command Architecture**: Improved command structure with better type safety
- **Utility Functions**: Modular timezone utilities for reusability

## [2.0.1] - 2025-08-10

### 🐛 Bug Fixes

- **Documentation**: Update repository clone instructions in README to reflect new repository name (elara)

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
