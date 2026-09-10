import { defineConfig } from "drizzle-kit";

// Separate from drizzle.config.ts (which targets the local SQLite schema
// used by the browser). This one targets the real server-side Postgres
// (Neon) schema introduced 2026-09-10 for user accounts — see
// src/server/db/schema.ts. Migrations use the *unpooled* connection string
// since DDL needs session-level behaviour a transaction-mode pooler
// doesn't support (see the Neon connection-pooling guidance).
export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle-server",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
});
