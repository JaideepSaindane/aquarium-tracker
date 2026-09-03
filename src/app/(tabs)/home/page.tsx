"use client";

import { useState } from "react";
import Link from "next/link";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { SecondaryButton, PrimaryButton } from "@/components/Button";
import { useLiveQuery } from "@/db/live";
import { listTanks } from "@/db/queries/tanks";
import { listAllActiveTasks, completeTask } from "@/db/queries/tasks";
import { syncReminder, removeReminderSync } from "@/lib/push-client";
import { bucketFor, isOnDay, type ScheduleBucket } from "@/lib/schedule";

type Task = Awaited<ReturnType<typeof listAllActiveTasks>>[number];
type Tank = Awaited<ReturnType<typeof listTanks>>[number];

async function loadData() {
  const [tanks, tasks] = await Promise.all([listTanks(), listAllActiveTasks()]);
  return { tanks, tasks };
}

function addDays(d: Date, days: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + days);
  return c;
}

const BUCKET_LABELS: Record<ScheduleBucket, string> = {
  overdue: "Overdue",
  today: "Today",
  week: "This week",
  later: "Later",
};

export default function HomePage() {
  const { data, loading } = useLiveQuery(loadData, []);
  const [view, setView] = useState<"day" | "week">("week");
  const [dayOffset, setDayOffset] = useState(0);

  const tanks = data?.tanks ?? [];
  const tasks = data?.tasks ?? [];
  const tanksById = new Map(tanks.map((t) => [t.id, t]));

  async function handleComplete(task: Task) {
    const tank = tanksById.get(task.tankId);
    const result = await completeTask(task.id);
    if (result?.nextDueAt) {
      await syncReminder({ taskId: task.id, title: task.title, tankId: task.tankId, tankName: tank?.name ?? "Tank", dueAt: result.nextDueAt, rrule: task.rrule });
    } else {
      await removeReminderSync(task.id);
    }
  }

  if (!loading && tanks.length === 0) {
    return (
      <Screen>
        <BackHeader title="Home" fallbackHref="/" />
        <EmptyState icon="📅" message="No tanks yet. Scan a tank to set one up in a couple of minutes." />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
          <Link href="/onboarding/scan" style={{ textAlign: "center" }}>
            Scan a tank →
          </Link>
          <Link href="/tank/new" style={{ textAlign: "center" }}>
            Or add one by hand →
          </Link>
        </div>
      </Screen>
    );
  }

  const now = new Date();
  const day = addDays(now, dayOffset);

  let content;
  if (view === "day") {
    const dayTasks = tasks.filter((t) => isOnDay(t.nextDueAt, day) || (dayOffset === 0 && bucketFor(t.nextDueAt, now) === "overdue"));
    content = (
      <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <SecondaryButton style={{ width: "auto", padding: "4px 12px" }} onClick={() => setDayOffset((o) => o - 1)}>
            ← Prev
          </SecondaryButton>
          <strong>{day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</strong>
          <SecondaryButton style={{ width: "auto", padding: "4px 12px" }} onClick={() => setDayOffset((o) => o + 1)}>
            Next →
          </SecondaryButton>
        </div>
        <TaskList tasks={dayTasks} tanksById={tanksById} onComplete={handleComplete} />
        {dayTasks.length === 0 && <p style={{ color: "var(--color-ink-muted)" }}>Nothing due this day.</p>}
      </>
    );
  } else {
    const buckets: Record<ScheduleBucket, Task[]> = { overdue: [], today: [], week: [], later: [] };
    for (const t of tasks) buckets[bucketFor(t.nextDueAt, now)].push(t);
    content = (
      <>
        {(["overdue", "today", "week", "later"] as ScheduleBucket[]).map((b) =>
          buckets[b].length > 0 ? (
            <section key={b} style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>{BUCKET_LABELS[b]}</h2>
              <TaskList tasks={buckets[b]} tanksById={tanksById} onComplete={handleComplete} />
            </section>
          ) : null
        )}
        {tasks.length === 0 && <p style={{ color: "var(--color-ink-muted)" }}>Nothing scheduled — add a reminder from a tank&apos;s Schedule page.</p>}
      </>
    );
  }

  return (
    <Screen>
      <BackHeader
        title="Home"
        fallbackHref="/"
        right={
          <div style={{ display: "flex", gap: 8 }}>
          <SecondaryButton
            style={{ width: "auto", padding: "4px 12px" }}
            onClick={() => {
              setView("day");
              setDayOffset(0);
            }}
          >
            Day
          </SecondaryButton>
            <SecondaryButton style={{ width: "auto", padding: "4px 12px" }} onClick={() => setView("week")}>
              Week
            </SecondaryButton>
          </div>
        }
      />
      {content}
    </Screen>
  );
}

function TaskList({
  tasks,
  tanksById,
  onComplete,
}: {
  tasks: Task[];
  tanksById: Map<string, Tank>;
  onComplete: (t: Task) => void;
}) {
  return (
    <>
      {tasks.map((task) => {
        const tank = tanksById.get(task.tankId);
        return (
          <Card key={task.id} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{task.title}</strong>
                <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>
                  <Link href={`/tank/${task.tankId}/schedule`}>{tank?.name ?? "Tank"}</Link>
                  {task.nextDueAt ? ` · due ${new Date(task.nextDueAt).toLocaleDateString()}` : ""}
                  {task.rrule ? " · repeats" : ""}
                </p>
              </div>
              <PrimaryButton style={{ width: "auto", padding: "4px 12px" }} onClick={() => onComplete(task)}>
                Done
              </PrimaryButton>
            </div>
          </Card>
        );
      })}
    </>
  );
}
