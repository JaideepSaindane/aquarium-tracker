// UUID text primary keys generated client-side — docs/02-data-model.md: this
// is what makes future sync possible without renumbering.
export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
