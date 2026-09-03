// Run with: npm run eval:score
// Prints the T-002 summary table to the terminal. Same numbers the /eval.html
// review page shows — this is just the "one command" acceptance criterion.
import { computeSummary, printSummary } from "./scoring.js";

const summary = await computeSummary();
printSummary(summary);
