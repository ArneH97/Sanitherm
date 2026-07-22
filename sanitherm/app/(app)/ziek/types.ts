// Resultaattype voor het indienen van een ziekmelding.
export type ZiekResultaat =
  | { ok: true; heeftAttest: boolean }
  | { ok: false; fout: string };
