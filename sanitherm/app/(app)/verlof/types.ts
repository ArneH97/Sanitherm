// Resultaattype voor het indienen van een verlofaanvraag.
export type AanvraagResultaat =
  | { ok: true; dagen: number }
  | { ok: false; fout: string };
