# Elara

Elara enhances your community with seamless automation, intelligent moderation, and versatile tools that keep conversations flowing and your server running smoothly.

## Features

- **Modern Architecture**: Built with TypeScript, Discord.js v14, and DrizzleORM
- **Moderation Tools**: Kick, ban, timeout, and warning systems
- **Database Integration**: PostgreSQL with automated migrations
- **Event-Driven**: Responsive to guild events and interactions
- **Extensible**: Easy to add new commands and features
- **Type-Safe**: Full TypeScript support with custom types

## Prerequisites

- Node.js 18 or higher
- PostgreSQL database
- Discord Bot Token

## Setup

1. Clone the repository:

```bash
git clone https://github.com/NotKeira/solara.git
cd solara
```

2. Install dependencies:

```bash
pnpm install
```

3. Configure environment variables:

```bash
cp .env.example .env
# Edit .env with your bot token and database URL
```

4. Set up the database:

```bash
# Generate database schema
pnpm db:generate

# Run migrations
pnpm db:migrate
```

5. Start the bot:

```bash
# Development mode with hot reload
pnpm dev

# Production mode
pnpm build && pnpm start
```

## Commands

- `/ping` - Check bot latency and system stats
- `/kick` - Kick a member from the server (requires permissions)

## Project Structure

```
src/
├── commands/       # Slash commands
├── events/         # Discord event handlers
├── database/       # Database schema and connection
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── index.ts        # Main bot entry point
```

## Development

### Adding Commands

1. Create a new file in `src/commands/`
2. Implement the `Command` interface
3. Export the command class
4. Add export to `src/commands/index.ts`

### Adding Events

1. Create a new file in `src/events/`
2. Implement the `Event` interface
3. Export the event class
4. Add export to `src/events/index.ts`

### Database

Use DrizzleORM for database operations:

```bash
# Open database studio
pnpm db:studio

# Generate new migration
pnpm db:generate

# Apply migrations
pnpm db:migrate
```

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

Licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.
