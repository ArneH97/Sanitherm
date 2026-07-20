// Gedeelde resultaattypes voor de werknemers-actions.
// In een apart bestand zodat de "use server"-actions enkel async functies exporteren.
export type ToevoegenResultaat =
  | { ok: true; naam: string; email: string; wachtwoord: string }
  | { ok: false; fout: string };

export type ResetResultaat =
  | { ok: true; wachtwoord: string }
  | { ok: false; fout: string };
