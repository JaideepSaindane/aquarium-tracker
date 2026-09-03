import { getRedis } from "@/server/ai/redis";

// Server-side mirror for T-018 Web Push. This is a deliberate, narrow
// exception to Principle 05 ("SQLite is the source of truth, network is
// never a dependency") — a scheduled server job cannot send a push for a
// reminder it doesn't know about, so we mirror the minimum needed to fire
// one at the right time: a title, a due timestamp, and which anonymous
// device to notify. No tank data, species data, water test results, or
// photos are ever mirrored. Decided with Jaideep 2026-09-01 — see
// specs/PROGRESS.md decisions log.

export type PushSubscriptionJson = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type ReminderMirror = {
  taskId: string;
  deviceId: string;
  title: string;
  tankId: string;
  tankName: string;
  dueAt: string; // ISO
  rrule: string | null; // null = one-off, not rescheduled after firing
};

const subKey = (deviceId: string) => `push:sub:${deviceId}`;
const reminderKey = (deviceId: string, taskId: string) => `push:reminder:${deviceId}:${taskId}`;
const deviceTasksKey = (deviceId: string) => `push:tasks:${deviceId}`;
const scheduleKey = "push:schedule";
const scheduleMember = (deviceId: string, taskId: string) => `${deviceId}:${taskId}`;

export async function saveSubscription(deviceId: string, subscription: PushSubscriptionJson, deviceLabel?: string) {
  const redis = getRedis();
  await redis.set(subKey(deviceId), JSON.stringify({ subscription, deviceLabel, savedAt: new Date().toISOString() }));
}

export async function getSubscription(deviceId: string): Promise<PushSubscriptionJson | null> {
  const redis = getRedis();
  const raw = await redis.get<{ subscription: PushSubscriptionJson }>(subKey(deviceId));
  return raw?.subscription ?? null;
}

/** Removes the subscription and every reminder mirrored for this device — used on unsubscribe and on a dead-subscription prune (404/410 from the push service). */
export async function pruneDevice(deviceId: string) {
  const redis = getRedis();
  const taskIds = await redis.smembers(deviceTasksKey(deviceId));
  for (const taskId of taskIds) {
    await redis.del(reminderKey(deviceId, taskId));
    await redis.zrem(scheduleKey, scheduleMember(deviceId, taskId));
  }
  await redis.del(deviceTasksKey(deviceId));
  await redis.del(subKey(deviceId));
}

export async function upsertReminder(reminder: ReminderMirror) {
  const redis = getRedis();
  const { deviceId, taskId } = reminder;
  await redis.set(reminderKey(deviceId, taskId), reminder);
  await redis.sadd(deviceTasksKey(deviceId), taskId);
  await redis.zadd(scheduleKey, { score: new Date(reminder.dueAt).getTime(), member: scheduleMember(deviceId, taskId) });
}

export async function removeReminder(deviceId: string, taskId: string) {
  const redis = getRedis();
  await redis.del(reminderKey(deviceId, taskId));
  await redis.srem(deviceTasksKey(deviceId), taskId);
  await redis.zrem(scheduleKey, scheduleMember(deviceId, taskId));
}

/** Every reminder due at or before `now` (epoch ms) — the cron's work queue. */
export async function getDueReminders(now: number): Promise<{ deviceId: string; taskId: string }[]> {
  const redis = getRedis();
  const members = await redis.zrange<string[]>(scheduleKey, 0, now, { byScore: true });
  return members.map((m) => {
    const [deviceId, taskId] = m.split(":");
    return { deviceId, taskId };
  });
}

export async function getReminder(deviceId: string, taskId: string): Promise<ReminderMirror | null> {
  const redis = getRedis();
  return (await redis.get<ReminderMirror>(reminderKey(deviceId, taskId))) ?? null;
}

export async function rescheduleReminder(reminder: ReminderMirror, nextDueAt: string) {
  const updated = { ...reminder, dueAt: nextDueAt };
  await upsertReminder(updated);
}

export async function markSent(deviceId: string, taskId: string) {
  const redis = getRedis();
  await redis.zrem(scheduleKey, scheduleMember(deviceId, taskId));
}
