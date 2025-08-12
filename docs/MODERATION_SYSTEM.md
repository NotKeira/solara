# Moderation System Implementation Plan

## Database Schema Overview

The new schema implements a comprehensive case management system with the following key features:

### Core Tables

1. **`moderation_cases`** - Central case management table

   - Uses UUID for internal ID and 10-character `caseId` for user-facing display
   - Phone-friendly character set (excludes 0, 1, I, O for clarity)
   - Supports all moderation types including mass actions
   - Complete appeal system with decision tracking
   - Evidence and attachment support
   - Case linking for cross-server visibility

2. **`mass_actions`** - Tracks bulk moderation operations

   - Links to individual cases created during mass operations
   - Progress tracking (target/success/failure counts)
   - Status monitoring for long-running operations

3. **`predefined_reasons`** - Configurable reason templates

   - Type-specific reasons (ban, kick, timeout, etc.)
   - Default durations and severity levels
   - Usage tracking and analytics

4. **`case_links`** - Cross-server case sharing

   - Bidirectional or unidirectional sharing
   - Allows servers to view each other's moderation history

5. **`case_updates`** - Complete audit trail
   - Tracks all changes to cases
   - Who changed what and when

## Command Implementation Plan

### 1. Case Commands (`/case`)

#### `/case info <case_id>`

- Display comprehensive case information
- Show all evidence, updates, and appeal status
- Include linked cases from other servers (if configured)

#### `/case list [user] [type] [moderator] [status]`

- Paginated case listing with filters
- Support for active/closed/appealed status filtering
- User and moderator filtering
- Case type filtering (ban, kick, warn, etc.)

#### `/case update <case_id> <field> <new_value> [reason]`

- Update case fields (reason, evidence, notes, etc.)
- Automatic audit trail creation
- Permission checks for case modification

#### `/case close <case_id> [reason]`

- Close active cases
- Prevent further modifications
- Optional close reason

#### `/case delete <case_id> [reason]`

- Permanently delete case
- Require special permissions
- Log deletion in audit trail

#### `/case link <server_id> [link_type]`

- Link current server with another for case sharing
- Configure bidirectional or unidirectional sharing
- Require administrator permissions

### 2. Mass Commands (`/mass`)

#### `/mass ban <users> [reason] [duration] [delete_days]`

- Bulk ban operation with progress tracking
- Creates individual cases for each user
- Links all cases to a mass action record

#### `/mass kick <users> [reason]`

- Bulk kick operation
- Individual case creation per user

#### `/mass mute <users> [duration] [reason]`

- Bulk timeout/mute operation
- Duration support for temporary mutes

#### `/mass warn <users> [reason]`

- Bulk warning issuance
- Escalation tracking

### 3. Config Commands (`/config`)

#### `/config welcome message <message>`

- Set welcome message with variable support
- Variables: `{user}`, `{server}`, `{memberCount}`, etc.

#### `/config welcome channel <channel>`

- Set welcome message channel
- Auto-enable welcome system

#### `/config leave message <message>`

- Set leave message with variable support
- Similar variables to welcome

#### `/config leave channel <channel>`

- Set leave message channel
- Auto-enable leave system

#### `/config reasons add <type> <name> <reason> [duration] [severity]`

- Add predefined reason for specific action type
- Optional default duration and severity

#### `/config reasons list [type]`

- List all predefined reasons
- Filter by action type

#### `/config reasons edit <reason_id> <field> <value>`

- Edit existing predefined reasons
- Update usage count and analytics

#### `/config reasons remove <reason_id>`

- Remove predefined reason
- Soft delete to maintain case history integrity

#### `/config cases public <enabled>`

- Enable/disable public case viewing
- Allow non-moderators to view cases

#### `/config cases dm <enabled>`

- Enable/disable DMing users about their cases
- Privacy control

## Implementation Features

### 10-Character Case ID System

- Generated using phone-friendly characters: `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`
- Excludes confusing characters (0, 1, I, O) for better readability
- Collision detection and retry logic (extremely unlikely with 8.7 × 10^14 combinations)
- Always displayed in uppercase (e.g., `62J8QNAGB7`)
- Fallback to 12-character if collisions persist (virtually impossible)

### Evidence System

- Multiple evidence links per case
- File attachment support
- Automatic Discord message link parsing

### Appeal System

- Complete appeal workflow
- Decision tracking (approved/denied/pending)
- Appeal reason and decision reason storage

### Cross-Server Case Linking

- Share moderation history between trusted servers
- Configurable link types (bidirectional/unidirectional)
- Privacy controls and permissions

### Mass Action Tracking

- Progress monitoring for bulk operations
- Individual case creation for audit trail
- Failure handling and retry logic

### Audit Trail

- Complete change history for all cases
- Who changed what and when
- Reason tracking for all modifications

## Database Migration Strategy

1. **Phase 1**: Create new tables alongside existing ones
2. **Phase 2**: Migrate existing moderation data to new case system
3. **Phase 3**: Update commands to use new schema
4. **Phase 4**: Remove old tables after verification

## Command Permissions

- **Case Info**: Moderator or case visibility settings
- **Case List**: Moderator or public cases enabled
- **Case Update/Close/Delete**: Moderator with appropriate permissions
- **Case Link**: Administrator only
- **Mass Commands**: Appropriate moderation permissions (ban members, kick members, etc.)
- **Config Commands**: Administrator or Manage Server

## Next Steps

1. Create migration files for the new schema
2. Implement case management utilities
3. Create base command classes for case operations
4. Implement individual commands with proper error handling
5. Add comprehensive logging and analytics
6. Create documentation for moderators

This system provides a robust, scalable moderation framework that matches or exceeds expected capabilities while maintaining clean code structure and comprehensive audit trails.
