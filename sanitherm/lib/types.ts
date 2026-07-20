// Gedeelde TypeScript-types voor de databaserijen die de app gebruikt.

export type Rol = "arbeider" | "zaakvoerder";

export type RegistratieStatus = "open" | "bevestigd" | "goedgekeurd";

export interface Werknemer {
  id: string;
  naam: string;
  email: string;
  rol: Rol;
  actief: boolean;
  startdatum: string | null;
  provincie: string;
  standaard_uren_per_dag: number;
  standaard_uren_per_week: number;
  standaard_pauze_minuten: number;
  uurloon: number | null;
}

export interface Tijdsregistratie {
  id: string;
  werknemer_id: string;
  datum: string; // YYYY-MM-DD
  checkin: string | null; // ISO timestamp
  checkout: string | null;
  pauze_minuten: number;
  gewerkte_uren: number | null;
  status: RegistratieStatus;
  handmatig_aangepast: boolean;
  opmerking: string | null;
}
