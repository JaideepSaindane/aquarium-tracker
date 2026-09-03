// Custom SQLite worker for AquaAI. Deliberately NOT the @sqlite.org/sqlite-wasm
// package's own "worker1" bundle — that one auto-installs the older async OPFS
// VFS, which needs COOP/COEP (crossOriginIsolated) site-wide. Instead this
// installs the modern OPFS SAHPool VFS, which needs neither, at the cost of
// writing our own tiny message protocol instead of using their promiser.
//
// Falls back to an in-memory database (data lost on reload) if OPFS is
// unavailable in this browser — the main thread is told via the "ready"
// message's `persistent` flag so the app can show an honest warning instead
// of silently losing data. See src/db/client.ts.
import sqlite3InitModule from "./sqlite3-bundler-friendly.mjs";

let db = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The OPFS SAHPool VFS grants exclusive access to one tab/worker at a time
// across the whole origin — opening AquaAI in a second tab (or a stale tab
// left running in the background) makes this throw in every tab but the
// first, even though OPFS itself is fully supported. That's a transient
// lock, not "this browser can't do this," so it's worth a few short retries
// before falling back to an in-memory database — found live: a real user's
// tanks appeared to have vanished when this was a one-shot attempt, when
// the data was actually sitting safely in OPFS the whole time.
const OPFS_RETRY_DELAYS_MS = [300, 700, 1500];

async function tryOpenOpfs(sqlite3) {
  let lastErr = null;
  for (let attempt = 0; attempt <= OPFS_RETRY_DELAYS_MS.length; attempt++) {
    try {
      const poolUtil = await sqlite3.installOpfsSAHPoolVfs({ name: "opfs-sahpool" });
      return new sqlite3.oo1.DB("/aquaai.sqlite3", "c", poolUtil.vfsName);
    } catch (err) {
      lastErr = err;
      if (attempt < OPFS_RETRY_DELAYS_MS.length) await sleep(OPFS_RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastErr;
}

async function boot() {
  const sqlite3 = await sqlite3InitModule();
  let persistent = false;
  let opfsError = null;

  try {
    db = await tryOpenOpfs(sqlite3);
    persistent = true;
  } catch (err) {
    opfsError = String(err);
    db = new sqlite3.oo1.DB(":memory:", "c");
  }

  self.postMessage({ type: "ready", persistent, opfsError });
}

self.onmessage = async (ev) => {
  const msg = ev.data;
  if (msg.type === "init") {
    boot().catch((err) => self.postMessage({ type: "ready", persistent: false, opfsError: String(err) }));
    return;
  }
  if (msg.type === "query") {
    const { id, sql, params } = msg;
    if (!db) {
      self.postMessage({ type: "result", id, ok: false, error: "Database not initialised yet" });
      return;
    }
    try {
      const rows = [];
      // rowMode "array" (not "object") — Drizzle's sqlite-proxy driver maps
      // rows positionally against its own field metadata, not by column name.
      db.exec({ sql, bind: params ?? [], rowMode: "array", resultRows: rows });
      self.postMessage({ type: "result", id, ok: true, rows });
    } catch (err) {
      self.postMessage({ type: "result", id, ok: false, error: String(err) });
    }
  }
};
