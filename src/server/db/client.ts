import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Pooled connection (DATABASE_URL, "-pooler" host) — correct for normal
// request-scoped app queries on Vercel serverless. Migrations use the
// unpooled URL instead (see drizzle.config.server.ts) since DDL needs
// session-level behaviour a transaction-mode pooler doesn't support.
const sql = neon(process.env.DATABASE_URL!);

export const serverDb = drizzle(sql, { schema });
