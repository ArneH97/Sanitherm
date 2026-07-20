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
  // Prijs per overuur (door de zaakvoerder ingesteld). Het gewone uurloon
  // wordt niet meer gebruikt.
  overuur_prijs: number | null;
  // Standaard weekschema: uren per dag (ma–zo).
  rooster_ma: number;
  rooster_di: number;
  rooster_wo: number;
  rooster_do: number;
  rooster_vr: number;
  rooster_za: number;
  rooster_zo: number;
}

export const ROOSTER_DAGEN = [
  { key: "ma", label: "Ma" },
  { key: "di", label: "Di" },
  { key: "wo", label: "Wo" },
  { key: "do", label: "Do" },
  { key: "vr", label: "Vr" },
  { key: "za", label: "Za" },
  { key: "zo", label: "Zo" },
] as const;

export type RoosterDag = (typeof ROOSTER_DAGEN)[number]["key"];

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

// Verlofsoorten. 'overuren' = recuperatie van opgebouwde overuren (inhaalrust).
export type VerlofType =
  | "wettelijk_verlof"
  | "adv_inhaalrust"
  | "overuren"
  | "onbetaald"
  | "klein_verlet"
  | "ander";

export type AanvraagStatus =
  | "aangevraagd"
  | "goedgekeurd"
  | "geweigerd"
  | "geannuleerd";

export interface Verlofaanvraag {
  id: string;
  werknemer_id: string;
  type: VerlofType;
  van: string; // YYYY-MM-DD
  tot: string; // YYYY-MM-DD
  aantal_dagen: number;
  reden: string | null;
  status: AanvraagStatus;
  reden_weigering: string | null;
  aangevraagd_op: string;
  beoordeeld_op: string | null;
}

export interface Verloftellers {
  id: string;
  werknemer_id: string;
  jaar: number;
  wettelijk_verlof_totaal: number;
  wettelijk_verlof_opgenomen: number;
  adv_totaal: number;
  adv_opgenomen: number;
}

export interface Ziektemelding {
  id: string;
  werknemer_id: string;
  van: string; // YYYY-MM-DD
  tot: string | null;
  attest_pad: string | null; // pad in Supabase Storage bucket 'attesten'
  zaakvoerder_verwittigd: boolean;
  gemeld_op: string;
}

// Leesbare labels voor de verlofsoorten.
export const VERLOF_LABELS: Record<VerlofType, string> = {
  wettelijk_verlof: "Wettelijk verlof",
  adv_inhaalrust: "ADV-inhaalrust",
  overuren: "Overuren opnemen",
  onbetaald: "Onbetaald verlof",
  klein_verlet: "Klein verlet",
  ander: "Ander",
};

// Soorten die een werknemer zelf kan kiezen bij een aanvraag.
export const AANVRAAGBARE_VERLOF_TYPES: VerlofType[] = [
  "wettelijk_verlof",
  "adv_inhaalrust",
  "overuren",
  "onbetaald",
  "klein_verlet",
];

export const STATUS_LABELS: Record<AanvraagStatus, string> = {
  aangevraagd: "In behandeling",
  goedgekeurd: "Goedgekeurd",
  geweigerd: "Geweigerd",
  geannuleerd: "Geannuleerd",
};
