import { createClient } from "@/lib/supabase/server";
import { toonDatum, toonUren } from "@/lib/uren";
import { VERLOF_LABELS, type Verlofaanvraag } from "@/lib/types";
import { verlofBeslissen, weekBeslissen } from "./actions";

export const dynamic = "force-dynamic";

type VerlofRij = Verlofaanvraag & { werknemer: { naam: string } | null };
type WeekRij = {
  id: string;
  werknemer_id: string;
  jaar: number;
  weeknummer: number;
  totaal_uren: number;
  overuren: number;
  werknemer: { naam: string } | null;
};

export default async function GoedkeuringenPagina() {
  const supabase = await createClient();

  const [verlofRes, weekRes] = await Promise.all([
    supabase
      .from("verlofaanvragen")
      .select("*, werknemer:werknemers(naam)")
      .eq("status", "aangevraagd")
      .order("aangevraagd_op", { ascending: true }),
    supabase
      .from("weekbevestigingen")
      .select("*, werknemer:werknemers(naam)")
      .not("bevestigd_op", "is", null)
      .is("goedgekeurd_op", null)
      .order("jaar", { ascending: true })
      .order("weeknummer", { ascending: true }),
  ]);

  const verlof = (verlofRes.data as unknown as VerlofRij[]) ?? [];
  const weken = (weekRes.data as unknown as WeekRij[]) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Goedkeuringen</h1>
        <p className="text-sm text-slate-500">
          Verlofaanvragen en weekbevestigingen die op jou wachten.
        </p>
      </div>

      {/* Verlofaanvragen */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">
          Verlofaanvragen{" "}
          {verlof.length > 0 && (
            <span className="ml-1 rounded-full bg-merk px-2 py-0.5 text-xs font-medium text-white">
              {verlof.length}
            </span>
          )}
        </h2>

        {verlof.length === 0 ? (
          <LeegKaartje tekst="Geen openstaande verlofaanvragen." />
        ) : (
          <ul className="space-y-3">
            {verlof.map((a) => (
              <li
                key={a.id}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">
                      {a.werknemer?.naam ?? "Onbekend"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {VERLOF_LABELS[a.type]} · {toonDatum(a.van)} –{" "}
                      {toonDatum(a.tot)} · {a.aantal_dagen} dag
                      {a.aantal_dagen === 1 ? "" : "en"}
                    </p>
                    {a.reden && (
                      <p className="mt-1 text-sm text-slate-400">
                        “{a.reden}”
                      </p>
                    )}
                  </div>
                  <form action={verlofBeslissen}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="beslissing" value="goedkeuren" />
                    <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700">
                      Goedkeuren
                    </button>
                  </form>
                </div>

                <form
                  action={verlofBeslissen}
                  className="mt-3 flex gap-2 border-t border-slate-100 pt-3"
                >
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="beslissing" value="weigeren" />
                  <input
                    name="reden"
                    placeholder="Reden van weigering (optioneel)"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-merk focus:ring-2 focus:ring-merk/30"
                  />
                  <button className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50">
                    Weigeren
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Weekbevestigingen */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">
          Weekbevestigingen{" "}
          {weken.length > 0 && (
            <span className="ml-1 rounded-full bg-merk px-2 py-0.5 text-xs font-medium text-white">
              {weken.length}
            </span>
          )}
        </h2>

        {weken.length === 0 ? (
          <LeegKaartje tekst="Geen weken die op goedkeuring wachten." />
        ) : (
          <ul className="space-y-3">
            {weken.map((w) => (
              <li
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
              >
                <div>
                  <p className="font-medium text-slate-800">
                    {w.werknemer?.naam ?? "Onbekend"}
                  </p>
                  <p className="text-sm text-slate-500">
                    Week {w.weeknummer} · {w.jaar} · {toonUren(Number(w.totaal_uren))}
                    {Number(w.overuren) > 0 && (
                      <span className="text-merk">
                        {" "}
                        (waarvan {toonUren(Number(w.overuren))} overuren)
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={weekBeslissen}>
                    <input type="hidden" name="id" value={w.id} />
                    <input type="hidden" name="beslissing" value="terugsturen" />
                    <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                      Terugsturen
                    </button>
                  </form>
                  <form action={weekBeslissen}>
                    <input type="hidden" name="id" value={w.id} />
                    <input type="hidden" name="beslissing" value="goedkeuren" />
                    <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700">
                      Goedkeuren
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LeegKaartje({ tekst }: { tekst: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-200">
      {tekst}
    </div>
  );
}
