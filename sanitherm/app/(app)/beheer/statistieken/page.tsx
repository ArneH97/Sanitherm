import { createClient } from "@/lib/supabase/server";
import { overurenSaldo } from "@/lib/verlof";
import { vandaagInBrussel, isoWeek, toonUren } from "@/lib/uren";
import type { Werknemer } from "@/lib/types";

export const dynamic = "force-dynamic";

const fmtUTC = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;

export default async function StatistiekenPagina() {
  const supabase = await createClient();
  const vandaag = vandaagInBrussel();
  const eersteVanMaand = vandaag.slice(0, 8) + "01";

  // Startdatum voor 8 weken terug.
  const basis = new Date(vandaag + "T12:00:00Z");
  const vroegste = new Date(basis);
  vroegste.setUTCDate(basis.getUTCDate() - 7 * 8);
  const vanaf = fmtUTC(vroegste);

  const [wRes, todayRes, ziekRes, regsRes] = await Promise.all([
    supabase
      .from("werknemers")
      .select("*")
      .eq("rol", "arbeider")
      .eq("actief", true)
      .order("naam"),
    supabase
      .from("tijdsregistraties")
      .select("checkin, checkout")
      .eq("datum", vandaag),
    supabase
      .from("ziektemeldingen")
      .select("id", { count: "exact", head: true })
      .gte("van", eersteVanMaand),
    supabase
      .from("tijdsregistraties")
      .select("datum, gewerkte_uren, werknemer_id")
      .gte("datum", vanaf)
      .lte("datum", vandaag),
  ]);

  const werknemers = (wRes.data as Werknemer[]) ?? [];
  const saldi = await Promise.all(werknemers.map((w) => overurenSaldo(w)));

  const regs = (regsRes.data ?? []) as {
    datum: string;
    gewerkte_uren: number | null;
    werknemer_id: string;
  }[];

  // Uren per (ISO-)week, laatste 8 weken.
  const weken: { label: string; jaar: number; week: number; uren: number }[] =
    [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(basis);
    d.setUTCDate(basis.getUTCDate() - i * 7);
    const { jaar, week } = isoWeek(d);
    weken.push({ label: "w" + week, jaar, week, uren: 0 });
  }
  for (const r of regs) {
    const { jaar, week } = isoWeek(new Date(r.datum + "T12:00:00Z"));
    const b = weken.find((w) => w.jaar === jaar && w.week === week);
    if (b) b.uren += Number(r.gewerkte_uren ?? 0);
  }
  const maxWeek = Math.max(1, ...weken.map((w) => w.uren));

  // Uren per werknemer, deze maand.
  const perWerknemer = new Map<string, number>();
  for (const r of regs) {
    if (r.datum >= eersteVanMaand) {
      perWerknemer.set(
        r.werknemer_id,
        (perWerknemer.get(r.werknemer_id) ?? 0) + Number(r.gewerkte_uren ?? 0)
      );
    }
  }
  const urenPerWn = werknemers
    .map((w) => ({ naam: w.naam, uren: perWerknemer.get(w.id) ?? 0 }))
    .sort((a, b) => b.uren - a.uren);
  const maxUrenWn = Math.max(1, ...urenPerWn.map((x) => x.uren));

  // Overuren open per werknemer.
  const overPerWn = werknemers
    .map((w, i) => ({ naam: w.naam, uren: saldi[i].beschikbaar }))
    .filter((x) => x.uren > 0)
    .sort((a, b) => b.uren - a.uren);
  const maxOver = Math.max(1, ...overPerWn.map((x) => x.uren));

  // Kerncijfers.
  const today = (todayRes.data ?? []) as {
    checkin: string | null;
    checkout: string | null;
  }[];
  const aanwezig = today.filter((r) => r.checkin && !r.checkout).length;
  const urenDezeMaand = urenPerWn.reduce((s, x) => s + x.uren, 0);
  const overurenTotaal = saldi.reduce((s, x) => s + x.beschikbaar, 0);
  const ziekDezeMaand = ziekRes.count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Statistieken</h1>
        <p className="text-sm text-slate-500">Een overzicht in cijfers.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tegel label="Arbeiders" waarde={String(werknemers.length)} />
        <Tegel label="Nu aanwezig" waarde={String(aanwezig)} />
        <Tegel label="Uren deze maand" waarde={toonUren(urenDezeMaand)} klein />
        <Tegel label="Overuren open" waarde={toonUren(overurenTotaal)} klein />
      </div>

      <Kaart titel="Gewerkte uren per week" ondertitel="laatste 8 weken">
        <div className="flex items-end justify-between gap-1.5">
          {weken.map((w, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-28 w-full items-end">
                <div
                  className="w-full rounded-t bg-merk"
                  style={{
                    height: `${Math.max(3, (w.uren / maxWeek) * 112)}px`,
                  }}
                  title={`Week ${w.week}: ${toonUren(w.uren)}`}
                />
              </div>
              <span className="text-[10px] text-slate-400">{w.label}</span>
            </div>
          ))}
        </div>
      </Kaart>

      <Kaart titel="Uren per werknemer" ondertitel="deze maand">
        {urenPerWn.length === 0 ? (
          <Leeg />
        ) : (
          <div className="space-y-2.5">
            {urenPerWn.map((x) => (
              <Balk
                key={x.naam}
                naam={x.naam}
                waarde={toonUren(x.uren)}
                pct={(x.uren / maxUrenWn) * 100}
              />
            ))}
          </div>
        )}
      </Kaart>

      <Kaart titel="Openstaande overuren" ondertitel="per werknemer">
        {overPerWn.length === 0 ? (
          <Leeg tekst="Niemand heeft openstaande overuren." />
        ) : (
          <div className="space-y-2.5">
            {overPerWn.map((x) => (
              <Balk
                key={x.naam}
                naam={x.naam}
                waarde={toonUren(x.uren)}
                pct={(x.uren / maxOver) * 100}
              />
            ))}
          </div>
        )}
      </Kaart>

      <p className="text-xs text-slate-400">
        Deze maand: {ziekDezeMaand} ziekmelding{ziekDezeMaand === 1 ? "" : "en"}.
      </p>
    </div>
  );
}

function Tegel({
  label,
  waarde,
  klein,
}: {
  label: string;
  waarde: string;
  klein?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-200">
      <p
        className={`font-bold text-slate-900 ${klein ? "text-sm" : "text-2xl"}`}
      >
        {waarde}
      </p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function Kaart({
  titel,
  ondertitel,
  children,
}: {
  titel: string;
  ondertitel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-slate-900">{titel}</h2>
        {ondertitel && (
          <span className="text-xs text-slate-400">{ondertitel}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Balk({
  naam,
  waarde,
  pct,
}: {
  naam: string;
  waarde: string;
  pct: number;
}) {
  return (
    <div>
      <div className="mb-0.5 flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate text-slate-700">{naam}</span>
        <span className="shrink-0 font-medium text-slate-900">{waarde}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-100">
        <div
          className="h-2.5 rounded-full bg-merk"
          style={{ width: `${Math.max(3, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}

function Leeg({ tekst = "Nog geen gegevens." }: { tekst?: string }) {
  return <p className="py-4 text-center text-sm text-slate-400">{tekst}</p>;
}
