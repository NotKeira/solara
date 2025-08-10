import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export const Database = drizzle({
  connection: {
    connectionString: process.env["DATABASE_URL"]!,
  },
  schema,
});

export * from "./schema";
