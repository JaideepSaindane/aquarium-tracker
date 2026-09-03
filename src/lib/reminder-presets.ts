import { makeRrule } from "./recurrence";

// specs/T-018: "six one-tap presets with sensible defaults... Custom
// scheduling lives behind 'more' and is not the default path" — the direct
// fix for Aquarium Log's most common complaint ("nothing worked for me").
export type PresetType =
  | "water_change"
  | "filter_clean"
  | "dose"
  | "co2_refill"
  | "trim"
  | "test"
  | "feed"
  | "fertilizer"
  | "clean_glass"
  | "medication"
  | "quarantine_check";

export const REMINDER_PRESETS: { type: PresetType; label: string; intervalDays: number }[] = [
  { type: "water_change", label: "Water change", intervalDays: 7 },
  { type: "filter_clean", label: "Filter clean", intervalDays: 14 },
  { type: "dose", label: "Dose", intervalDays: 7 },
  { type: "co2_refill", label: "CO2 refill", intervalDays: 30 },
  { type: "trim", label: "Trim plants", intervalDays: 14 },
  { type: "test", label: "Test water", intervalDays: 7 },
  { type: "feed", label: "Feed", intervalDays: 1 },
  { type: "fertilizer", label: "Fertilizer", intervalDays: 7 },
  { type: "clean_glass", label: "Clean glass", intervalDays: 14 },
  { type: "medication", label: "Fish medication", intervalDays: 1 },
  { type: "quarantine_check", label: "Fish quarantine check", intervalDays: 3 },
];

export function presetRrule(intervalDays: number): string {
  return makeRrule(intervalDays);
}

export function presetLabel(type: string | null): string {
  return REMINDER_PRESETS.find((p) => p.type === type)?.label ?? "Reminder";
}
