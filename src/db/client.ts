"use client";

import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";
import { initDb, runQuery, type OpfsStatus } from "./sqlite-client";

export const db = drizzle(async (sql, params, method) => {
  const result = await runQuery(sql, params);
  if (!result.ok) {
    throw new Error(`SQLite error (${method}): ${result.error}\nSQL: ${sql}`);
  }
  return { rows: result.rows };
}, { schema });

let bootPromise: Promise<OpfsStatus> | null = null;

/** Opens the worker DB. Idempotent — call from any component that needs the DB ready. */
export function ensureDb(): Promise<OpfsStatus> {
  if (!bootPromise) bootPromise = initDb();
  return bootPromise;
}
