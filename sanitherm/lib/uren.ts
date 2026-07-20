// Hulpfuncties voor tijd- en urenberekening.

// Bereken de gewerkte uren op basis van check-in, check-out en pauze (minuten).
export function berekenGewerkteUren(
  checkin: string | null,
  checkout: string | null,
  pauzeMinuten: number
): number | null {
  if (!checkin || !checkout) return null;
  const start = new Date(checkin).getTime();
  const eind = new Date(checkout).getTime();
  if (isNaN(start) || isNaN(eind) || eind <= start) return null;
  const bruto = (eind - start) / 1000 / 60; // minuten
  const netto = Math.max(0, bruto - pauzeMinuten);
  return Math.round((netto / 60) * 100) / 100; // uren, 2 decimalen
}

// ISO-weeknummer (maandag als eerste dag) en het bijhorende jaar.
export function isoWeek(datum: Date): { jaar: number; week: number } {
  const d = new Date(
    Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate())
  );
  const dag = d.getUTCDay() || 7; // zondag = 7
  d.setUTCDate(d.getUTCDate() + 4 - dag);
  const jaarStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - jaarStart.getTime()) / 86400000 + 1) / 7
  );
  return { jaar: d.getUTCFullYear(), week };
}

// Maandag (start) van de week waarin `datum` valt, als YYYY-MM-DD.
export function maandagVanWeek(datum: Date): string {
  const d = new Date(datum);
  const dag = d.getDay() || 7;
  d.setDate(d.getDate() - (dag - 1));
  return isoDatum(d);
}

// Vandaag als YYYY-MM-DD in de Belgische tijdzone.
export function vandaagInBrussel(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Brussels",
  });
}

// Datum naar YYYY-MM-DD (lokale tijd).
export function isoDatum(datum: Date): string {
  const j = datum.getFullYear();
  const m = String(datum.getMonth() + 1).padStart(2, "0");
  const d = String(datum.getDate()).padStart(2, "0");
  return `${j}-${m}-${d}`;
}

const TIJDZONE = "Europe/Brussels";

// Toon een tijdstip als HH:MM in de Belgische tijdzone.
export function toonTijd(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("nl-BE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIJDZONE,
  });
}

// Toon een aantal (decimale) uren als "8 uren en 30 minuten".
// Voor gewerkte uren, weektotalen en overuren — niet voor klok-tijden.
export function toonUren(uren: number | null): string {
  if (uren == null) return "—";
  const negatief = uren < 0;
  const totaalMin = Math.round(Math.abs(uren) * 60);
  const u = Math.floor(totaalMin / 60);
  const m = totaalMin % 60;

  const uurLabel = `${u} ${u === 1 ? "uur" : "uren"}`;
  const minLabel = `${m} ${m === 1 ? "minuut" : "minuten"}`;

  let tekst: string;
  if (u > 0 && m > 0) tekst = `${uurLabel} en ${minLabel}`;
  else if (u > 0) tekst = uurLabel;
  else if (m > 0) tekst = minLabel;
  else tekst = "0 uren";

  return negatief ? `− ${tekst}` : tekst;
}

// Bereken de tijdzone-offset (in ms) voor een instant in een gegeven tijdzone.
function offsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
  const alsUTC = Date.UTC(
    +p.year,
    +p.month - 1,
    +p.day,
    +p.hour,
    +p.minute,
    +p.second
  );
  return alsUTC - date.getTime();
}

// Zet een wandklok-tijd (datum YYYY-MM-DD + tijd HH:MM in België) om naar een
// correcte UTC-instant (ISO-string). Houdt rekening met zomer-/wintertijd.
export function wandtijdNaarInstant(
  datum: string,
  tijd: string,
  timeZone = TIJDZONE
): string {
  const gok = new Date(`${datum}T${tijd}:00Z`);
  const offset = offsetMs(gok, timeZone);
  return new Date(gok.getTime() - offset).toISOString();
}

// Datumlabel zoals "ma 6 jul".
export function toonDatum(datum: string): string {
  const d = new Date(datum + "T00:00:00");
  return d.toLocaleDateString("nl-BE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Begin- (maandag) en einddatum (zondag) van een ISO-week, als YYYY-MM-DD.
// Omgekeerde van isoWeek(): handig om de dagen van een bevestigde week te vinden.
export function isoWeekNaarDatums(
  jaar: number,
  week: number
): { van: string; tot: string } {
  // 4 januari zit per definitie altijd in ISO-week 1.
  const vierde = new Date(Date.UTC(jaar, 0, 4));
  const dag = vierde.getUTCDay() || 7; // maandag = 1 … zondag = 7
  const week1Maandag = new Date(vierde);
  week1Maandag.setUTCDate(vierde.getUTCDate() - (dag - 1));

  const maandag = new Date(week1Maandag);
  maandag.setUTCDate(week1Maandag.getUTCDate() + (week - 1) * 7);
  const zondag = new Date(maandag);
  zondag.setUTCDate(maandag.getUTCDate() + 6);

  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getUTCDate()).padStart(2, "0")}`;

  return { van: fmt(maandag), tot: fmt(zondag) };
}

// ---- Kalender-helpers ----

// Alle 42 dagen (6 weken, maandag-eerst) voor de maand "YYYY-MM", als YYYY-MM-DD.
export function maandGrid(maand: string): string[] {
  const [j, m] = maand.split("-").map(Number);
  const eerste = new Date(Date.UTC(j, m - 1, 1));
  const dow = eerste.getUTCDay() || 7; // maandag = 1 … zondag = 7
  const start = new Date(eerste);
  start.setUTCDate(eerste.getUTCDate() - (dow - 1));

  const dagen: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    dagen.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getUTCDate()).padStart(2, "0")}`
    );
  }
  return dagen;
}

// Maandlabel, bv. "juli 2026".
export function toonMaand(maand: string): string {
  const [j, m] = maand.split("-").map(Number);
  const d = new Date(Date.UTC(j, m - 1, 1));
  return d.toLocaleDateString("nl-BE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Verschuif een maand ("YYYY-MM") met een aantal maanden.
export function maandVerschuif(maand: string, delta: number): string {
  const [j, m] = maand.split("-").map(Number);
  const d = new Date(Date.UTC(j, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Ancienniteit als leesbare tekst, bv. "3 jaar, 2 maanden".
export function ancienniteit(startdatum: string | null): string {
  if (!startdatum) return "onbekend";
  const start = new Date(startdatum + "T12:00:00");
  const nu = new Date(vandaagInBrussel() + "T12:00:00");
  if (isNaN(start.getTime()) || start > nu) return "—";

  let maanden =
    (nu.getFullYear() - start.getFullYear()) * 12 +
    (nu.getMonth() - start.getMonth());
  if (nu.getDate() < start.getDate()) maanden--;
  if (maanden < 0) maanden = 0;

  const jaren = Math.floor(maanden / 12);
  const rest = maanden % 12;
  const delen: string[] = [];
  if (jaren > 0) delen.push(`${jaren} jaar`);
  if (rest > 0) delen.push(`${rest} maand${rest === 1 ? "" : "en"}`);
  if (delen.length === 0) return "minder dan een maand";
  return delen.join(", ");
}

// Aantal werkdagen (ma–vr) tussen twee datums, beide inbegrepen.
// Weekends tellen niet mee. Feestdagen/bouwverlof worden hier niet afgetrokken.
export function werkdagenTussen(van: string, tot: string): number {
  const d = new Date(van + "T12:00:00");
  const eind = new Date(tot + "T12:00:00");
  if (isNaN(d.getTime()) || isNaN(eind.getTime()) || eind < d) return 0;
  let n = 0;
  while (d <= eind) {
    const dag = d.getDay(); // 0 = zondag, 6 = zaterdag
    if (dag !== 0 && dag !== 6) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}
