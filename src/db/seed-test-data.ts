"use client";

// Populates a realistic test database — three tanks, livestock (including
// one added over 90 days ago), a few hundred measurements across several
// parameters, ~50 photo rows, a handful of tasks and journal entries. T-012,
// T-017, T-022 and T-026 all depend on this existing. See T-011 spec
// "Migration discipline". Safe to run more than once — each run adds a
// fresh batch rather than upserting, since this is throwaway dev data.
import { db } from "./client";
import { tanks, livestock, measurements, parameterDefs, tasks, logEntries, photos } from "./schema";
import { newId, nowIso } from "./id";
import { notifyChanged } from "./live";

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function seedTestData() {
  const now = nowIso();
  const paramDefs = await db.select().from(parameterDefs);
  if (paramDefs.length === 0) {
    throw new Error("Seed the global parameter defs first (seedParameterDefs()).");
  }

  const tankSpecs = [
    { name: "Living Room 60L", lengthCm: 60, widthCm: 30, heightCm: 36, city: "Bangalore", isPlanted: true },
    { name: "Shrimp Nano", lengthCm: 25, widthCm: 20, heightCm: 22, city: "Bangalore", isPlanted: true },
    { name: "Betta Bowl", lengthCm: 30, widthCm: 20, heightCm: 25, city: "Bangalore", isPlanted: false },
  ];

  const tankIds: string[] = [];
  for (const spec of tankSpecs) {
    const id = newId();
    const volumeL = Math.round(((spec.lengthCm * spec.widthCm * spec.heightCm) / 1000) * 10) / 10;
    await db.insert(tanks).values({
      id,
      name: spec.name,
      lengthCm: spec.lengthCm,
      widthCm: spec.widthCm,
      heightCm: spec.heightCm,
      volumeL,
      city: spec.city,
      isPlanted: spec.isPlanted,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    tankIds.push(id);
  }

  // Livestock — one added well over 90 days ago, so the survival-metric
  // logic (T-026) has something realistic to compute against.
  const livestockSpecs = [
    { tankId: tankIds[0], speciesId: "neon-tetra", count: 8, addedOn: daysAgoIso(120) },
    { tankId: tankIds[0], speciesId: "amano-shrimp", count: 3, addedOn: daysAgoIso(45) },
    { tankId: tankIds[1], speciesId: "cherry-shrimp", count: 10, addedOn: daysAgoIso(200) },
    { tankId: tankIds[2], speciesId: "betta", count: 1, addedOn: daysAgoIso(10) },
  ];
  for (const l of livestockSpecs) {
    await db.insert(livestock).values({
      id: newId(),
      tankId: l.tankId,
      speciesId: l.speciesId,
      count: l.count,
      addedOn: l.addedOn,
      status: "alive",
      createdAt: now,
      updatedAt: now,
    });
  }

  // A few hundred measurements across several parameters, spread over 90 days.
  const trackedParams = paramDefs.filter((p) => ["Ammonia", "Nitrite", "Nitrate", "pH", "Temperature"].includes(p.name as string));
  let measurementCount = 0;
  for (const tankId of tankIds) {
    for (let day = 0; day < 30; day++) {
      for (const p of trackedParams) {
        const base = p.name === "pH" ? 7 : p.name === "Temperature" ? 25 : p.name === "Nitrate" ? 10 : 0.1;
        const value = Math.round((base + (Math.random() - 0.5) * base * 0.3) * 100) / 100;
        await db.insert(measurements).values({
          id: newId(),
          tankId,
          parameterId: p.id as string,
          value,
          measuredAt: daysAgoIso(day),
          method: "liquid_kit",
          createdAt: now,
        });
        measurementCount++;
      }
    }
  }

  // ~50 photo rows (placeholder URIs — no real files needed to exercise the schema/queries).
  for (let i = 0; i < 50; i++) {
    await db.insert(photos).values({
      id: newId(),
      tankId: tankIds[i % tankIds.length],
      localUri: `test-data/photo-${i}.jpg`,
      takenAt: daysAgoIso(i),
      createdAt: now,
    });
  }

  // A handful of tasks and journal entries.
  for (const tankId of tankIds) {
    await db.insert(tasks).values({
      id: newId(),
      tankId,
      title: "Water change",
      presetType: "water_change",
      nextDueAt: daysAgoIso(-7),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(logEntries).values({
      id: newId(),
      tankId,
      type: "journal",
      body: "Test data seeded via /dev/db.",
      occurredAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  notifyChanged();
  return { tanks: tankIds.length, livestock: livestockSpecs.length, measurements: measurementCount, photos: 50, tasks: tankIds.length, logEntries: tankIds.length };
}
