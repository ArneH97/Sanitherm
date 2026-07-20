import { createClient } from "@/lib/supabase/server";
import { huidigeWerknemer } from "@/lib/werknemer";
import { vandaagInBrussel, toonTijd, toonDatum, toonUren } from "@/lib/uren";
import type { Tijdsregistratie } from "@/lib/types";
import { inchecken, uitchecken, corrigeer } from "./actions";

export const dynamic = "force-dynamic";

export default async function VandaagPagina() {
  const werknemer = await huidigeWerknemer();
  const supabase = await createClient();
  const datum = vandaagInBrussel();

  const { data } = await supabase
    .from("tijdsregistraties")
    .select("*")
    .eq("werknemer_id", werknemer!.id)
    .eq("datum", datum)
    .maybeSingle();

  const reg = data as Tijdsregistratie | null;
  const ingecheckt = !!reg?.checkin;
  const uitgecheckt = !!reg?.checkout;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Vandaag</h1>
        <p className="text-sm text-slate-500">{toonDatum(datum)}</p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Ingecheckt
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {toonTijd(reg?.checkin ?? null)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Uitgecheckt
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {toonTijd(reg?.checkout ?? null)}
            </p>
          </div>
        </div>

        {!ingecheckt && (
          <form action={inchecken}>
            <button className="w-full rounded-xl bg-merk py-4 text-lg font-semibold text-white transition hover:bg-merk-donker">
              Inchecken
            </button>
          </form>
        )}

        {ingecheckt && !uitgecheckt && (
          <form action={uitchecken}>
            <button className="w-full rounded-xl bg-slate-900 py-4 text-lg font-semibold text-white transition hover:bg-slate-700">
              Uitchecken
            </button>
          </form>
        )}

        {uitgecheckt && (
          <div className="rounded-xl bg-merk-licht py-4 text-center">
            <p className="text-sm text-slate-600">Gewerkt vandaag</p>
            <p className="text-2xl font-bold text-merk">
              {toonUren(reg?.gewerkte_uren ?? null)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              (pauze {reg?.pauze_minuten} min afgetrokken)
            </p>
          </div>
        )}
      </div>

      {/* Correctie: bv. te laat ingecheckt */}
      {ingecheckt && (
        <details className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Tijd corrigeren
          </summary>
          <p className="mt-2 text-xs text-slate-500">
            Was je te laat of vergat je in te checken? Pas de tijd aan. Elke
            correctie wordt bijgehouden.
          </p>
          <form action={corrigeer} className="mt-4 flex items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Welke tijd
              </label>
              <select
                name="veld"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="checkin">Incheck-tijd</option>
                <option value="checkout">Uitcheck-tijd</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Nieuwe tijd
              </label>
              <input
                type="time"
                name="tijd"
                required
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button className="rounded-lg bg-merk px-4 py-2 text-sm font-medium text-white hover:bg-merk-donker">
              Opslaan
            </button>
          </form>
          {reg?.handmatig_aangepast && (
            <p className="mt-3 text-xs text-amber-600">
              Deze dag is handmatig aangepast.
            </p>
          )}
        </details>
      )}
    </div>
  );
}
