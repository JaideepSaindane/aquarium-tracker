"use client";

// T-013 verification page — exercises the client-side AI helper (which logs
// every call into the local ai_interactions table) against the real proxy
// routes. Not linked from the app; visit /dev/ai directly.
import { useState } from "react";
import { ensureDb } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { askQuestion, checkCompat } from "@/lib/ai-client";
import { listAiInteractions } from "@/db/queries/ai-interactions";

export default function AiDevPage() {
  const [log, setLog] = useState<string[]>([]);
  function line(s: string) {
    setLog((prev) => [...prev, s]);
  }

  return (
    <div style={{ padding: 24, fontFamily: "monospace", fontSize: 13 }}>
      <h1>T-013 AI proxy verification</h1>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button
          onClick={async () => {
            await ensureDb();
            await runMigrations();
            line("DB ready.");
          }}
        >
          1. Boot DB
        </button>
        <button
          onClick={async () => {
            const before = (await listAiInteractions()).length;
            const result = await askQuestion({
              question: "What does a sponge filter do?",
              tankContext: "Tank: 60x30x36cm, 65L, planted. Livestock: 8 neon tetras.",
            });
            const after = (await listAiInteractions()).length;
            line(`askQuestion ok=${result.ok} rows before=${before} after=${after}`);
            if (after > before) {
              const rows = await listAiInteractions();
              const last = rows[rows.length - 1];
              line(`last row: kind=${last.kind} promptVersion=${last.promptVersion} tokensIn=${last.inputTokens} tokensOut=${last.outputTokens} costUsd=${last.costUsd} latencyMs=${last.latencyMs}`);
            }
          }}
        >
          2. Ask a question, check ai_interactions logged it
        </button>
        <button
          onClick={async () => {
            const result = await checkCompat({ lengthCm: 90, widthCm: 30, heightCm: 36, existingSpeciesIds: ["neon-tetra"], newSpeciesIds: ["betta"] });
            line(`checkCompat ok=${result.ok} verdict=${result.ok ? (result.data.compat as { verdict: string }).verdict : "n/a"}`);
          }}
        >
          3. Check compatibility
        </button>
      </div>
      <pre>{log.join("\n")}</pre>
    </div>
  );
}
