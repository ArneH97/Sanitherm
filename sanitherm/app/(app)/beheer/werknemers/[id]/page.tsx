import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { overurenSaldo } from "@/lib/verlof";
import { vandaagInBrussel, ancienniteit, toonDatum, toonUren } from "@/lib/uren";
import type { Werknemer, Verloftellers } from "@/lib/types";
import RoosterVelden from "@/components/RoosterVelden";
import WachtwoordResetKnop from "../WachtwoordResetKnop";
import { profielOpslaan, verlofTellerOpslaan } from "../actions";

export const dynamic = "force-dynamic";

export default async function WerknemerProfiel({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const jaar = Number(vandaagInBrussel().slice(0, 4));

  const { data: wData } = await supabase
    .from("werknemers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const werknemer = wData as Werknemer | null;

  if (!werknemer) {
    return (
      <div className="space-y-4">
        <Link href="/beheer/werknemers" className="text-sm text-merk">
          ← Terug naar werknemers
        </Link>
        <p className="text-slate-500">Werknemer niet gevonden.</p>
      </div>
    );
  }

  const [saldo, tellerRes] = await Promise.all([
    overurenSaldo(werknemer),
    supabase
      .from("verloftellers")
      .select("*")
      .eq("werknemer_id", id)
      .eq("jaar", jaar)
      .maybeSingle(),
  ]);
  const teller = tellerRes.data as Verloftellers | null;

  const wvTotaalDef = teller?.wettelijk_verlof_totaal ?? 20;
  const wvOverDef = teller
    ? teller.wettelijk_verlof_totaal - teller.wettelijk_verlof_opgenomen
    : 20;
  const advTotaalDef = teller?.adv_totaal ?? 12;
  const advOverDef = teller
    ? teller.adv_totaal - teller.adv_opgenomen
    : 12;

  const inputKlasse =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-merk focus:ring-2 focus:ring-merk/30";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/beheer/werknemers"
          className="text-sm text-slate-500 hover:text-merk"
        >
          ← Terug naar werknemers
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">{werknemer.naam}</h1>
          {!werknemer.actief && (
            <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500">
              inactief
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500">{werknemer.email}</p>
      </div>

      {/* Kerncijfers */}
      <div className="grid grid-cols-3 gap-3">
        <Tegel label="Ancienniteit" waarde={ancienniteit(werknemer.startdatum)} />
        <Tegel label="Overuren open" waarde={toonUren(saldo.beschikbaar)} />
        <Tegel
          label="Prijs/overuur"
          waarde={
            werknemer.overuur_prijs != null
              ? "€ " + werknemer.overuur_prijs.toFixed(2).replace(".", ",")
              : "—"
          }
        />
      </div>

      <p className="text-xs text-slate-400">
        Overuren: {toonUren(saldo.opgebouwd)} opgebouwd ·{" "}
        {toonUren(saldo.opgenomen)} opgenomen · in dienst sinds{" "}
        {werknemer.startdatum ? toonDatum(werknemer.startdatum) : "onbekend"}.
      </p>

      {/* Profiel bewerken */}
      <form
        action={profielOpslaan}
        className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <input type="hidden" name="id" value={werknemer.id} />
        <h2 className="text-base font-semibold text-slate-900">Gegevens</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Veld label="In dienst sinds">
            <input
              name="startdatum"
              type="date"
              defaultValue={werknemer.startdatum ?? ""}
              className={inputKlasse}
            />
          </Veld>
          <Veld label="Prijs per overuur (€)">
            <input
              name="overuur_prijs"
              inputMode="decimal"
              placeholder="bv. 25,00"
              defaultValue={werknemer.overuur_prijs ?? ""}
              className={inputKlasse}
            />
          </Veld>
        </div>
        <RoosterVelden
          waarden={{
            ma: werknemer.rooster_ma,
            di: werknemer.rooster_di,
            wo: werknemer.rooster_wo,
            do: werknemer.rooster_do,
            vr: werknemer.rooster_vr,
            za: werknemer.rooster_za,
            zo: werknemer.rooster_zo,
          }}
        />
        <button className="rounded-lg bg-merk px-4 py-2.5 font-medium text-white transition hover:bg-merk-donker">
          Gegevens opslaan
        </button>
      </form>

      {/* Verlofteller */}
      <form
        action={verlofTellerOpslaan}
        className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <input type="hidden" name="id" value={werknemer.id} />
        <input type="hidden" name="jaar" value={jaar} />
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Verlofteller {jaar}
          </h2>
          <p className="text-sm text-slate-500">
            Stel het totaal per jaar in, en hoeveel er nu nog over is (in dagen).
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Veld label="Wettelijk verlof — totaal">
            <input
              name="wv_totaal"
              inputMode="decimal"
              defaultValue={wvTotaalDef}
              className={inputKlasse}
            />
          </Veld>
          <Veld label="Wettelijk verlof — nog over">
            <input
              name="wv_over"
              inputMode="decimal"
              defaultValue={wvOverDef}
              className={inputKlasse}
            />
          </Veld>
          <Veld label="ADV-inhaalrust — totaal">
            <input
              name="adv_totaal"
              inputMode="decimal"
              defaultValue={advTotaalDef}
              className={inputKlasse}
            />
          </Veld>
          <Veld label="ADV-inhaalrust — nog over">
            <input
              name="adv_over"
              inputMode="decimal"
              defaultValue={advOverDef}
              className={inputKlasse}
            />
          </Veld>
        </div>
        <button className="rounded-lg bg-merk px-4 py-2.5 font-medium text-white transition hover:bg-merk-donker">
          Verlofteller opslaan
        </button>
      </form>

      {/* Aanmelding */}
      <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold text-slate-900">Aanmelding</h2>
        <p className="text-sm text-slate-600">
          Mailadres:{" "}
          <span className="font-medium text-slate-900">{werknemer.email}</span>
        </p>
        <p className="text-sm text-slate-500">
          Het wachtwoord kan om veiligheidsredenen niet getoond worden — het
          staat versleuteld opgeslagen. Stel een nieuw tijdelijk wachtwoord in
          en geef dat aan de werknemer door:
        </p>
        <WachtwoordResetKnop id={werknemer.id} naam={werknemer.naam} />
      </div>
    </div>
  );
}

function Tegel({ label, waarde }: { label: string; waarde: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-200">
      <p className="text-lg font-bold text-slate-900">{waarde}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function Veld({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
