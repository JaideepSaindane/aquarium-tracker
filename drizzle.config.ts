import { defineConfig } from "drizzle-kit";

// Migrations are generated here (Node, at dev/build time via `npm run db:generate`)
// then bundled into src/db/migrations.generated.ts for the browser to apply at
// runtime — see scripts/bundle-migrations.mjs. The browser never touches this
// folder directly; drizzle-orm/sqlite-proxy's built-in migrator needs Node `fs`,
// which doesn't exist client-side.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
});
