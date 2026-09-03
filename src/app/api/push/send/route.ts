import { NextRequest, NextResponse } from "next/server";
import { getDueReminders, getReminder, getSubscription, markSent, rescheduleReminder, pruneDevice } from "@/server/push/store";
import { sendPush } from "@/server/push/web-push";
import { nextOccurrence } from "@/lib/recurrence";

// Cron entry point — specs/T-018: "a scheduled job... querying tasks due in
// the current window across all users, and sending a push per due task."
// Configured in vercel.json to run hourly. Recurring reminders reschedule
// themselves here (server-side) after firing, so they keep arriving even if
// the app is never reopened to re-sync.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const due = await getDueReminders(now);

  let sent = 0;
  let pruned = 0;
  let skipped = 0;

  for (const { deviceId, taskId } of due) {
    const reminder = await getReminder(deviceId, taskId);
    const subscription = await getSubscription(deviceId);

    if (!reminder || !subscription) {
      // Orphaned schedule entry (subscription revoked without going through
      // /api/push/subscribe DELETE, or a race with a task delete) — drop it
      // rather than retrying forever.
      await markSent(deviceId, taskId);
      skipped++;
      continue;
    }

    const result = await sendPush(subscription, {
      title: reminder.title,
      body: `${reminder.tankName ? reminder.tankName + " — " : ""}due now`,
      taskId,
      tankId: reminder.tankId,
    });

    if (!result.ok && (result.statusCode === 404 || result.statusCode === 410)) {
      await pruneDevice(deviceId);
      pruned++;
      continue;
    }

    const next = nextOccurrence(reminder.dueAt, reminder.rrule);
    if (next) {
      await rescheduleReminder(reminder, next);
    } else {
      await markSent(deviceId, taskId);
    }
    if (result.ok) sent++;
  }

  return NextResponse.json({ ok: true, checked: due.length, sent, pruned, skipped });
}
