import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { users } from "./schema"; // Only import what we actually use

export const Database = drizzle({
  connection: {
    connectionString: process.env["DATABASE_URL"]!,
  },
});

// Export only essential schema parts
export { users };
