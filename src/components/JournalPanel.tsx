"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { PhotoViewer } from "@/components/PhotoViewer";
import { PhotoPickerButton } from "@/components/PhotoPickerButton";
import { useLiveQuery } from "@/db/live";
import { addLogEntry, listLogEntriesForTank } from "@/db/queries/log-entries";
import { addPhoto, listPhotosForTank } from "@/db/queries/photos";
import { uploadPhoto } from "@/lib/photo-upload";
import { usePhotoSrc } from "@/lib/use-photo-src";

const TYPE_LABELS: Record<string, string> = {
  journal: "Journal",
  maintenance: "Maintenance",
  incident: "Incident",
  treatment: "Treatment",
  water_change: "Water change",
};

const TYPE_COLORS: Record<string, string> = {
  journal: "var(--color-ink-muted)",
  maintenance: "var(--color-improve)",
  incident: "var(--color-fix-now)",
  treatment: "var(--color-watch)",
  water_change: "var(--color-deep)",
};

async function loadJournal(tankId: string) {
  const [entries, photos] = await Promise.all([listLogEntriesForTank(tankId), listPhotosForTank(tankId)]);
  const photosByEntry = new Map<string, typeof photos>();
  for (const p of photos) {
    if (!p.logEntryId) continue;
    const list = photosByEntry.get(p.logEntryId) ?? [];
    list.push(p);
    photosByEntry.set(p.logEntryId, list);
  }
  return { entries, photosByEntry };
}

/** Dated entries, search, and a new-entry form — shared between the dedicated Journal page and the tank overview's inline collapsed section. */
export function JournalPanel({ tankId, autoOpenNew }: { tankId: string; autoOpenNew?: boolean }) {
  const { data } = useLiveQuery(() => loadJournal(tankId), [tankId]);

  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(!!autoOpenNew);
  const [body, setBody] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);

  if (!data) return null;
  const { entries, photosByEntry } = data;

  const filtered = search.trim()
    ? entries.filter((e) => (e.body ?? "").toLowerCase().includes(search.trim().toLowerCase()))
    : entries;

  async function handleAddEntry() {
    if (!body.trim()) return;
    setSaving(true);
    const entryId = await addLogEntry({ tankId, type: "journal", body: body.trim() });
    if (photoFile) {
      // Uploads to Vercel Blob (2026-09-11), not OPFS — see
      // src/lib/photo-upload.ts.
      const url = await uploadPhoto(photoFile);
      await addPhoto({ tankId, logEntryId: entryId, localUri: url });
    }
    setBody("");
    setPhotoFile(null);
    setShowNew(false);
    setSaving(false);
  }

  return (
    <div>
      {viewerSrc && <PhotoViewer src={viewerSrc} onClose={() => setViewerSrc(null)} />}

      <Field label="" placeholder="Search journal..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <div style={{ height: 12 }} />

      {!showNew ? (
        <PrimaryButton onClick={() => setShowNew(true)}>+ New entry</PrimaryButton>
      ) : (
        <Card style={{ marginBottom: 16 }}>
          <Field label="" placeholder="What's happening in the tank?" value={body} onChange={(e) => setBody(e.target.value)} />
          <div style={{ height: 8 }} />
          <PhotoPickerButton label={photoFile ? "Photo attached ✓" : "Add a photo"} onPick={setPhotoFile} />
          <div style={{ height: 8 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <PrimaryButton onClick={handleAddEntry} disabled={saving || !body.trim()}>
              {saving ? "Saving..." : "Save entry"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setShowNew(false)}>Cancel</SecondaryButton>
          </div>
        </Card>
      )}

      <div style={{ height: 16 }} />

      {filtered.length === 0 && <p style={{ color: "var(--color-ink-muted)" }}>{search ? "No entries match." : "No journal entries yet."}</p>}

      {filtered.map((e) => (
        <JournalRow key={e.id} entry={e} photos={photosByEntry.get(e.id) ?? []} onOpenPhoto={setViewerSrc} />
      ))}
    </div>
  );
}

function JournalRow({
  entry,
  photos,
  onOpenPhoto,
}: {
  entry: { id: string; type: string | null; body: string | null; occurredAt: string };
  photos: { localUri: string }[];
  onOpenPhoto: (src: string) => void;
}) {
  const thumbUrl = usePhotoSrc(photos[0]?.localUri);

  const type = entry.type ?? "journal";

  return (
    <Card style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ color: TYPE_COLORS[type] ?? "var(--color-ink)", fontWeight: 600, fontSize: "var(--font-caption-size)" }}>
          {TYPE_LABELS[type] ?? type}
        </span>
        <span style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>
          {new Date(entry.occurredAt).toLocaleDateString()}
        </span>
      </div>
      <p>{entry.body}</p>
      {thumbUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbUrl}
          alt=""
          onClick={() => onOpenPhoto(thumbUrl)}
          style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, marginTop: 8, cursor: "pointer" }}
        />
      )}
    </Card>
  );
}
