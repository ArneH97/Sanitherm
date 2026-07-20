// Resultaattype voor het indienen van een ziekmelding.
export type ZiekResultaat =
  | { ok: true }
  | { ok: false; fout: string };
