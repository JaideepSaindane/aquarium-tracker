"use client";

// Anonymous device id for AI quota tracking — no accounts in Phase 1.
// localStorage, not the local SQLite `settings` table: this needs to be
// available before the database has necessarily booted, and it isn't real
// user data that belongs in an export.
const KEY = "aquaai-device-id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
