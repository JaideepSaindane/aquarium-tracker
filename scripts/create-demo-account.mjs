// Creates (or refreshes) the shared demo account for accelerator judges as a
// snapshot copy of a source account — by default Jaideep's own.
//
//   node --env-file=.env.local scripts/create-demo-account.mjs
//
// Re-running it wipes the demo account's data (whatever judges changed) and
// re-copies the source account as it is now. The source account is only
// ever read, never written.
//
// Copied: tanks, livestock + their timeline, measurements, plants,
// equipment, journal, photos, scans, Ask AquaAI history, Dex unlocks,
// dismissed warnings, settings, species suggestions, parameter targets,
// profile. Not copied: community posts/comments/likes (they're already
// public in the shared feed — copies would just show twice), feedback, and
// analytics (page views, installs), which would skew the admin dashboard.
//
// Photo files are NOT duplicated — the copied rows point at the same Vercel
// Blob URLs. That's why src/server/auth/demo-account.ts blocks deleting the
// demo account (account deletion deletes the account's Blob files).

import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

const SOURCE_EMAIL = process.env.DEMO_SOURCE_EMAIL ?? "jaideep.saindane@gmail.com";
const DEMO_PHONE = "0000000000"; // keep in sync with src/constants/app.ts
const DEMO_PIN = process.env.DEMO_PIN ?? "1234";

const sql = neon(process.env.DATABASE_URL);

const source = (await sql`select id from users where lower(email) = ${SOURCE_EMAIL.toLowerCase()}`)[0];
if (!source) throw new Error(`No account with email ${SOURCE_EMAIL}`);

let demo = (await sql`select id from users where phone = ${DEMO_PHONE}`)[0];
if (demo && demo.id === source.id) throw new Error("Demo phone is attached to the source account — refusing.");

const pinHash = await bcrypt.hash(DEMO_PIN, 10);
if (!demo) {
  demo = { id: randomUUID() };
  await sql`insert into users (id, phone, pin_hash, name, created_at) values (${demo.id}, ${DEMO_PHONE}, ${pinHash}, 'Demo account', now())`;
  console.log("Created demo user", demo.id);
} else {
  await sql`update users set pin_hash = ${pinHash} where id = ${demo.id}`;
  console.log("Refreshing existing demo user", demo.id);
}

// Every per-user table this script copies, in an order where a row's
// parent ids are already remapped by the time it's copied.
const TABLES = [
  "tanks",
  "livestock",
  "livestock_events",
  "measurements",
  "plants",
  "equipment",
  "log_entries",
  "scans",
  "photos",
  "ai_interactions",
  "dex_cards",
  "dismissed_warnings",
  "species_suggestions",
  "parameter_defs",
  "user_settings",
  "profile",
];

// 1. Wipe the demo account's current data (scoped to the demo id only).
for (const t of TABLES) {
  await sql.query(`delete from ${t} where user_id = $1`, [demo.id]);
}

// 2. Copy, giving every row a fresh id and pointing references at the
//    copies. idMaps[table] maps a source row id to its copy's id.
const idMaps = {};
const REFS = {
  tank_id: "tanks",
  livestock_id: "livestock",
  log_entry_id: "log_entries",
  scan_id: "scans",
};

async function copyTable(table) {
  const rows = await sql.query(`select * from ${table} where user_id = $1`, [source.id]);
  idMaps[table] = new Map();
  for (const row of rows) {
    const copy = { ...row, user_id: demo.id };
    if ("id" in copy) {
      copy.id = randomUUID();
      idMaps[table].set(row.id, copy.id);
    }
    for (const [col, parent] of Object.entries(REFS)) {
      if (copy[col] != null) copy[col] = idMaps[parent]?.get(copy[col]) ?? copy[col];
    }
    if (table === "profile") copy.username = `${row.username ?? "jd"}_demo`;
    const cols = Object.keys(copy);
    await sql.query(
      `insert into ${table} (${cols.map((c) => `"${c}"`).join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")})`,
      cols.map((c) => copy[c]),
    );
  }
  console.log(`${table}: ${rows.length}`);
}

for (const t of TABLES) await copyTable(t);

console.log(`Done. Sign in with "Demo account" and PIN ${DEMO_PIN}.`);
