// Gedeeld resultaattype voor het toevoegen van een arbeider.
// In een apart bestand zodat de "use server"-actions enkel async functies exporteren.
export type ToevoegenResultaat =
  | { ok: true; naam: string; email: string; wachtwoord: string }
  | { ok: false; fout: string };
