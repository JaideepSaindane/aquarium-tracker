"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Banner } from "@/components/Banner";
import { PrimaryButton, SecondaryButton, DangerButton } from "@/components/Button";
import { useLiveQuery } from "@/db/live";
import { getTank } from "@/db/queries/tanks";
import { listTasksForTank, createTask, completeTask, rescheduleTask, deleteTask } from "@/db/queries/tasks";
import { REMINDER_PRESETS, presetRrule } from "@/lib/reminder-presets";
import { makeRrule } from "@/lib/recurrence";
import { syncReminder, removeReminderSync } from "@/lib/push-client";
import { bucketFor, localDateInputToIso } from "@/lib/schedule";

type Task = Awaited<ReturnType<typeof listTasksForTank>>[number];

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString();
}

/** The full reminders UI (presets, custom form, bucketed task list) — shared between the dedicated Schedule page and the tank overview's inline collapsed section. */
export function RemindersPanel({ tankId }: { tankId: string }) {
  const { data: tank } = useLiveQuery(() => getTank(tankId), [tankId]);
  const { data: tasks } = useLiveQuery(() => listTasksForTank(tankId), [tankId]);

  const [showCustom, setShowCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customInterval, setCustomInterval] = useState("7");
  const [customOneOff, setCustomOneOff] = useState(false);
  const [addingType, setAddingType] = useState<string | null>(null);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  if (!tank) return null;

  async function addPreset(type: string, label: string, intervalDays: number) {
    if (addingType) return;
    setAddingType(type);
    setAddedMessage(null);
    try {
      const nextDueAt = daysFromNow(intervalDays);
      const rrule = presetRrule(intervalDays);
      const taskId = await createTask({ tankId, title: label, presetType: type, rrule, nextDueAt });
      await syncReminder({ taskId, title: label, tankId, tankName: tank!.name, dueAt: nextDueAt, rrule });
      setAddedMessage(`Reminder set: ${label}.`);
    } finally {
      setAddingType(null);
    }
  }

  async function addCustom() {
    if (!customTitle.trim() || addingType) return;
    setAddingType("custom");
    setAddedMessage(null);
    try {
      const days = Math.max(1, Number(customInterval) || 1);
      const nextDueAt = daysFromNow(days);
      const rrule = customOneOff ? null : makeRrule(days);
      const title = customTitle.trim();
      const taskId = await createTask({ tankId, title, presetType: "custom", rrule, nextDueAt });
      await syncReminder({ taskId, title, tankId, tankName: tank!.name, dueAt: nextDueAt, rrule });
      setCustomTitle("");
      setCustomInterval("7");
      setCustomOneOff(false);
      setShowCustom(false);
      setAddedMessage(`Reminder set: ${title}.`);
    } finally {
      setAddingType(null);
    }
  }

  async function handleComplete(task: Task) {
    const result = await completeTask(task.id);
    if (result?.nextDueAt) {
      await syncReminder({ taskId: task.id, title: task.title, tankId, tankName: tank!.name, dueAt: result.nextDueAt, rrule: task.rrule });
    } else {
      await removeReminderSync(task.id);
    }
  }

  async function handleReschedule(task: Task, newDate: string) {
    if (!newDate) return;
    const iso = localDateInputToIso(newDate);
    await rescheduleTask(task.id, iso);
    await syncReminder({ taskId: task.id, title: task.title, tankId, tankName: tank!.name, dueAt: iso, rrule: task.rrule });
  }

  async function handleDelete(task: Task) {
    await deleteTask(task.id);
    await removeReminderSync(task.id);
  }

  const now = new Date();
  const buckets: Record<string, Task[]> = { overdue: [], today: [], week: [], later: [] };
  for (const t of tasks ?? []) buckets[bucketFor(t.nextDueAt, now)].push(t);

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>Add a reminder</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {REMINDER_PRESETS.map((p) => (
            <SecondaryButton key={p.type} onClick={() => addPreset(p.type, p.label, p.intervalDays)} disabled={addingType !== null}>
              {addingType === p.type ? "Adding..." : p.label}
            </SecondaryButton>
          ))}
        </div>
        {addedMessage && (
          <div style={{ marginTop: 8 }}>
            <Banner severity="improve">{addedMessage}</Banner>
          </div>
        )}
        <div style={{ height: 8 }} />
        {!showCustom && <SecondaryButton onClick={() => setShowCustom(true)}>More...</SecondaryButton>}
        {showCustom && (
          <div style={{ marginTop: 8, borderTop: "1px solid var(--color-line)", paddingTop: 8 }}>
            <Field label="Title" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="e.g. Feed fry" />
            <div style={{ height: 8 }} />
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <input type="checkbox" checked={customOneOff} onChange={(e) => setCustomOneOff(e.target.checked)} />
              One-off (doesn&apos;t repeat)
            </label>
            {!customOneOff && (
              <Field label="Repeat every (days)" type="number" value={customInterval} onChange={(e) => setCustomInterval(e.target.value)} />
            )}
            <div style={{ height: 8 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <PrimaryButton onClick={addCustom} disabled={addingType !== null}>
                {addingType === "custom" ? "Adding..." : "Add"}
              </PrimaryButton>
              <SecondaryButton onClick={() => setShowCustom(false)}>Cancel</SecondaryButton>
            </div>
          </div>
        )}
      </Card>

      <TaskSection title="Overdue" tasks={buckets.overdue} onComplete={handleComplete} onReschedule={handleReschedule} onDelete={handleDelete} />
      <TaskSection title="Today" tasks={buckets.today} onComplete={handleComplete} onReschedule={handleReschedule} onDelete={handleDelete} />
      <TaskSection title="This week" tasks={buckets.week} onComplete={handleComplete} onReschedule={handleReschedule} onDelete={handleDelete} />
      <TaskSection title="Later" tasks={buckets.later} onComplete={handleComplete} onReschedule={handleReschedule} onDelete={handleDelete} />

      {(tasks ?? []).length === 0 && <p style={{ color: "var(--color-ink-muted)" }}>No reminders yet.</p>}
    </div>
  );
}

function TaskSection({
  title,
  tasks,
  onComplete,
  onReschedule,
  onDelete,
}: {
  title: string;
  tasks: Task[];
  onComplete: (t: Task) => void;
  onReschedule: (t: Task, newDate: string) => void;
  onDelete: (t: Task) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <section style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>{title}</h2>
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} onComplete={() => onComplete(t)} onReschedule={(d) => onReschedule(t, d)} onDelete={() => onDelete(t)} />
      ))}
    </section>
  );
}

function TaskRow({ task, onComplete, onReschedule, onDelete }: { task: Task; onComplete: () => void; onReschedule: (d: string) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [dateValue, setDateValue] = useState(task.nextDueAt ? task.nextDueAt.slice(0, 10) : "");

  return (
    <Card style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <strong>{task.title}</strong>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>
            {task.nextDueAt ? `due ${new Date(task.nextDueAt).toLocaleDateString()}` : "no due date"}
            {task.rrule ? " · repeats" : ""}
          </p>
        </div>
        <PrimaryButton style={{ width: "auto", padding: "4px 12px" }} onClick={onComplete}>
          Done
        </PrimaryButton>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
        {editing ? (
          <>
            <input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} style={{ padding: 4 }} />
            <SecondaryButton
              style={{ width: "auto", padding: "4px 12px" }}
              onClick={() => {
                onReschedule(dateValue);
                setEditing(false);
              }}
            >
              Save
            </SecondaryButton>
          </>
        ) : (
          <SecondaryButton style={{ width: "auto", padding: "4px 12px" }} onClick={() => setEditing(true)}>
            Reschedule
          </SecondaryButton>
        )}
        <DangerButton style={{ width: "auto", padding: "4px 12px" }} onClick={onDelete}>
          Delete
        </DangerButton>
      </div>
    </Card>
  );
}
