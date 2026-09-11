// The 8 standard water parameters, free forever per CLAUDE.md/Principle 02.
// Extracted 2026-09-11 from src/db/queries/parameter-defs.ts's old
// STANDARD_PARAMETERS + seedParameterDefs(): these were being seeded as
// rows in a table for no real reason — the values never change per user or
// per install, so they're a plain constant now. Only genuine per-tank
// overrides/custom parameters are real user data and live server-side
// (src/app/api/parameter-defs/*).
export const STANDARD_PARAMETERS = [
  { name: "Ammonia", unit: "ppm", targetMin: 0, targetMax: 0.25, decimals: 2, sortOrder: 1 },
  { name: "Nitrite", unit: "ppm", targetMin: 0, targetMax: 0.25, decimals: 2, sortOrder: 2 },
  { name: "Nitrate", unit: "ppm", targetMin: 0, targetMax: 20, decimals: 0, sortOrder: 3 },
  { name: "pH", unit: "", targetMin: 6.5, targetMax: 7.5, decimals: 1, sortOrder: 4 },
  { name: "GH", unit: "dGH", targetMin: 4, targetMax: 12, decimals: 0, sortOrder: 5 },
  { name: "KH", unit: "dKH", targetMin: 3, targetMax: 8, decimals: 0, sortOrder: 6 },
  { name: "Temperature", unit: "°C", targetMin: 22, targetMax: 28, decimals: 1, sortOrder: 7 },
  { name: "TDS", unit: "ppm", targetMin: 100, targetMax: 300, decimals: 0, sortOrder: 8 },
] as const;
