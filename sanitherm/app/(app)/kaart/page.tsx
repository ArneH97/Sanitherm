import { createClient } from "@/lib/supabase/server";
import { huidigeWerknemer } from "@/lib/werknemer";
import { overurenSaldo } from "@/lib/verlof";
import { ancienniteit, toonDatum, toonUren } from "@/lib/uren";
import { contactkaartOpslaan } from "./actions";

export const dynamic = "force-dynamic";

export default async function KaartPagina() {
  const ik = await huidigeWerknemer();
  const supabase = await createClient();

  const [urenRes, saldo] = await Promise.all([
    supabase
      .from("tijdsregistraties")
      .select("gewerkte_uren")
      .eq("werknemer_id", ik!.id),
    overurenSaldo(ik!),
  ]);

  const totaalUren = (urenRes.data ?? []).reduce(
    (s, r) => s + Number((r as { gewerkte_uren: number | null }).gewerkte_uren ?? 0),
    0
  );

  const w = ik!;
  const inputKlasse =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-merk focus:ring-2 focus:ring-merk/30";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Mijn kaart</h1>
        <p className="text-sm text-slate-500">
          Je gegevens en je loopbaan bij Sanitherm.
        </p>
      </div>

      {/* Loopbaan */}
      <div className="grid grid-cols-3 gap-3">
        <Tegel label="In dienst" waarde={ancienniteit(w.startdatum)} klein />
        <Tegel label="Totaal gewerkt" waarde={toonUren(totaalUren)} klein />
        <Tegel
          label="Overuren opgebouwd"
          waarde={toonUren(saldo.opgebouwd)}
          klein
        />
      </div>
      <p className="-mt-3 text-xs text-slate-400">
        In dienst sinds{" "}
        {w.startdatum ? toonDatum(w.startdatum) : "onbekend"} · aangemeld als{" "}
        {w.email}
      </p>

      {/* Contactgegevens */}
      <form
        action={contactkaartOpslaan}
        className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <h2 className="text-base font-semibold text-slate-900">
          Contactgegevens
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Veld label="Voornaam">
            <input
              name="voornaam"
              defaultValue={w.voornaam ?? ""}
              className={inputKlasse}
            />
          </Veld>
          <Veld label="Achternaam">
            <input
              name="achternaam"
              defaultValue={w.achternaam ?? ""}
              className={inputKlasse}
            />
          </Veld>
        </div>
        <Veld label="Adres">
          <input
            name="adres"
            defaultValue={w.adres ?? ""}
            placeholder="Straat nr, postcode gemeente"
            className={inputKlasse}
          />
        </Veld>
        <div className="grid gap-4 sm:grid-cols-2">
          <Veld label="Geboortedatum">
            <input
              name="geboortedatum"
              type="date"
              defaultValue={w.geboortedatum ?? ""}
              className={inputKlasse}
            />
          </Veld>
          <Veld label="Gsm-nummer">
            <input
              name="gsm"
              type="tel"
              inputMode="tel"
              defaultValue={w.gsm ?? ""}
              placeholder="0470 12 34 56"
              className={inputKlasse}
            />
          </Veld>
        </div>

        <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="mb-3 text-sm font-medium text-slate-700">
            Noodcontact
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Veld label="Naam">
              <input
                name="noodcontact_naam"
                defaultValue={w.noodcontact_naam ?? ""}
                placeholder="bv. partner of ouder"
                className={inputKlasse}
              />
            </Veld>
            <Veld label="Gsm-nummer">
              <input
                name="noodcontact_gsm"
                type="tel"
                inputMode="tel"
                defaultValue={w.noodcontact_gsm ?? ""}
                className={inputKlasse}
              />
            </Veld>
          </div>
        </div>

        <button className="rounded-lg bg-merk px-4 py-2.5 font-medium text-white transition hover:bg-merk-donker">
          Opslaan
        </button>
      </form>
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
      <p className={`font-bold text-slate-900 ${klein ? "text-sm" : "text-2xl"}`}>
        {waarde}
      </p>
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
