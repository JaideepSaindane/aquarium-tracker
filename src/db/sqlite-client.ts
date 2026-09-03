"use client";

// Minimal hand-rolled RPC to public/sqlite/aquaai-worker.mjs. Deliberately
// does not import @sqlite.org/sqlite-wasm on the main thread — that package
// is ~800KB of glue code we don't need outside the worker, and importing it
// here would bloat every page's bundle for a factory function we can
// replace with plain postMessage.
// rowMode "array" — see aquaai-worker.mjs. Each row is a plain array of
// positional column values, matching what drizzle-orm/sqlite-proxy expects.
export type QueryResult = { ok: true; rows: unknown[][] } | { ok: false; error: string };

export type OpfsStatus = { ready: boolean; persistent: boolean; opfsError: string | null };

let worker: Worker | null = null;
let readyPromise: Promise<OpfsStatus> | null = null;
let nextId = 1;
const pending = new Map<number, (result: QueryResult) => void>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker("/sqlite/aquaai-worker.mjs", { type: "module" });
    worker.onmessage = (ev: MessageEvent) => {
      const msg = ev.data;
      if (msg.type === "result") {
        const resolve = pending.get(msg.id);
        if (resolve) {
          pending.delete(msg.id);
          resolve(msg.ok ? { ok: true, rows: msg.rows } : { ok: false, error: msg.error });
        }
      }
    };
  }
  return worker;
}

/** Boots the worker and opens the database. Safe to call more than once — returns the same promise. */
export function initDb(): Promise<OpfsStatus> {
  if (readyPromise) return readyPromise;
  readyPromise = new Promise((resolve) => {
    const w = getWorker();
    const onReady = (ev: MessageEvent) => {
      if (ev.data.type === "ready") {
        w.removeEventListener("message", onReady);
        resolve({ ready: true, persistent: ev.data.persistent, opfsError: ev.data.opfsError ?? null });
      }
    };
    w.addEventListener("message", onReady);
    w.postMessage({ type: "init" });
  });
  return readyPromise;
}

/** Runs one SQL statement against the worker DB. Used by the Drizzle sqlite-proxy driver — see src/db/client.ts. */
export function runQuery(sql: string, params: unknown[]): Promise<QueryResult> {
  return new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    getWorker().postMessage({ type: "query", id, sql, params });
  });
}
