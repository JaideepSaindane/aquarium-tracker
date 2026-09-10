import { getTank } from "@/db/queries/tanks";
import { listLivestockForTank } from "@/db/queries/livestock";
import { listPlantsForTank } from "@/db/queries/plants";
import { listEquipmentForTank } from "@/db/queries/equipment";
import { listMeasurementsForTank } from "@/db/queries/measurements";
import { listGlobalParameterDefs } from "@/db/queries/parameter-defs";
import { listLogEntriesForTank } from "@/db/queries/log-entries";
import { getSpecies } from "@/db/queries/species";

/**
 * Assembles the tank-context string sent to /ask (docs/03-ai-contracts.md
 * Contract 2): dimensions, water type, planted/CO2, city, age, livestock
 * and plants with care ranges, equipment, last 5 readings per parameter
 * with target ranges, last 10 log entries. Parameter history will read as
 * "no readings logged yet" for most tanks today — T-017 (the logging UI)
 * was explicitly skipped, so the table this reads from is rarely populated
 * outside dev-seeded data; this still degrades gracefully rather than
 * erroring, per the surrounding AI contracts' "never a dead end" rule.
 */
export async function buildTankContext(tankId: string): Promise<string> {
  const tank = await getTank(tankId);
  if (!tank) return "(tank not found)";

  const [livestock, plants, equipment, measurements, paramDefs, logEntries] = await Promise.all([
    listLivestockForTank(tankId),
    listPlantsForTank(tankId),
    listEquipmentForTank(tankId),
    listMeasurementsForTank(tankId),
    listGlobalParameterDefs(),
    listLogEntriesForTank(tankId),
  ]);

  const lines: string[] = [];
  const ageDays = tank.startedOn ? Math.max(0, Math.round((Date.now() - new Date(tank.startedOn).getTime()) / 86400000)) : null;

  lines.push(`Tank: ${tank.name}`);
  lines.push(`Dimensions: ${tank.lengthCm}x${tank.widthCm}x${tank.heightCm} cm, ${tank.volumeL} L`);
  lines.push(`Water type: ${tank.waterType ?? "unknown"}`);
  lines.push(`Planted: ${tank.isPlanted ? "yes" : "no"}, CO2: ${tank.hasCo2 ? "yes" : "no"}`);
  if (tank.city) lines.push(`City: ${tank.city}`);
  // Deliberately labelled as unverified, not "Tank age" — `startedOn` is
  // derived from a rough age band the user tapped (2026-09-10: "Just set
  // up" / "A few weeks" / etc., src/components/AgeBandField.tsx), stored as
  // that band's midpoint date, not a confirmed physical setup date. Never
  // let this number read as proof of cycling stage — see prompts/tank-scan.v2.md and
  // prompts/ask.v1.md, which are both told explicitly not to treat it as one.
  if (ageDays != null) lines.push(`Tank age: about ${ageDays} days (from a rough self-reported age band, not verified — may not reflect actual physical tank age)`);

  const aliveLivestock = livestock.filter((l) => l.status === "alive");
  if (aliveLivestock.length === 0) {
    lines.push("Livestock: none yet");
  } else {
    lines.push("Livestock:");
    for (const l of aliveLivestock) {
      const species = await getSpecies(l.speciesId);
      const name = species ? firstName(species.commonNames) ?? species.id : l.speciesId;
      const ranges = species
        ? ` (temp ${species.tempCMin ?? "?"}-${species.tempCMax ?? "?"}°C, pH ${species.phMin ?? "?"}-${species.phMax ?? "?"}, adult size ${species.adultSizeCm ?? "?"}cm)`
        : "";
      lines.push(`  - ${l.count}x ${name}${ranges}`);
    }
  }

  if (plants.length > 0) {
    lines.push(`Plants: ${plants.map((p) => p.commonName).join(", ")}`);
  }

  if (equipment.length > 0) {
    lines.push(`Equipment: ${equipment.map((e) => `${e.type}${e.wattage ? ` ${e.wattage}W` : ""}${e.ratedLph ? ` ${e.ratedLph}L/h` : ""}`).join(", ")}`);
  }

  const byParam = new Map(paramDefs.map((p) => [p.id, p]));
  const recentByParam = new Map<string, typeof measurements>();
  for (const m of measurements) {
    const list = recentByParam.get(m.parameterId) ?? [];
    list.push(m);
    recentByParam.set(m.parameterId, list);
  }
  if (recentByParam.size === 0) {
    lines.push("Water parameters: no readings logged yet");
  } else {
    lines.push("Recent water parameters:");
    for (const [paramId, readings] of recentByParam) {
      const def = byParam.get(paramId);
      const sorted = readings.sort((a, b) => (b.measuredAt ?? "").localeCompare(a.measuredAt ?? "")).slice(0, 5);
      const target = def ? ` (target ${def.targetMin}-${def.targetMax}${def.unit ?? ""})` : "";
      lines.push(`  - ${def?.name ?? paramId}${target}: ${sorted.map((r) => r.value).join(", ")}`);
    }
  }

  if (logEntries.length > 0) {
    lines.push("Recent log entries:");
    for (const e of logEntries.slice(0, 10)) {
      lines.push(`  - [${e.type}] ${e.occurredAt.slice(0, 10)}: ${e.body ?? ""}`);
    }
  }

  return lines.join("\n");
}

function firstName(json: string | null): string | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) && parsed[0] ? parsed[0] : null;
  } catch {
    return null;
  }
}
