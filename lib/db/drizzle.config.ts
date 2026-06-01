import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  // Forward-slash relative path: drizzle-kit globs this, and backslashes from
  // path.join() are treated as escapes (breaks on Windows). Resolved relative
  // to this config file.
  schema: "./src/schema/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
