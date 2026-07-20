import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { huidigeWerknemer } from "@/lib/werknemer";
import {
  vandaagInBrussel,
  maandagVanWeek,
  isoDatum,
  isoWeek,
  toonDatum,
  toonTijd,
  toonUren,
} from "@/lib/uren";
import type { Tijdsregistratie } from "@/lib/types";
import { bevestigWeek } from "./actions";
import MeldingenAanzetten from "@/components/MeldingenAanzetten";

export const dynamic = "force-dynamic";

export default async function WeekPagina({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string }>;
}) {
  const params = await searchParams;
  const offset = Number(params.offset ?? "0") || 0;

  const werknemer = await huidigeWerknemer();
  const supabase = await createClient();

  // Referentiedatum = vandaag - offset weken.
  const basis = new Date(vandaagInBrussel() + "T12:00:00");
  basis.setDate(basis.getDate() - offset * 7);
  const maandagStr = maandagVanWeek(basis);
  const maandag = new Date(maandagStr + "T12:00:00");
  const zondag = new Date(maandag);
  zondag.setDate(zondag.getDate() + 6);
  const zondagStr = isoDatum(zondag);

  const { jaar, week } = isoWeek(maandag);

  // Registraties van deze week.
  const { data } = await supabase
    .from("tijdsregistraties")
    .select("*")
    .eq("werknemer_id", werknemer!.id)
    .gte("datum", maandagStr)
    .lte("datum", zondagStr)
    .order("datum");
  const regs = (data as Tijdsregistratie[]) ?? [];

  // Al bevestigd?
  const { data: bev } = await supabase
    .from("weekbevestigingen")
    .select("bevestigd_op")
    .eq("werknemer_id", werknemer!.id)
    .eq("jaar", jaar)
    .eq("weeknummer", week)
    .maybeSingle();
  const bevestigd = !!bev?.bevestigd_op;

  // Bouw 7 dagen op.
  const dagen: { datum: string; reg: Tijdsregistratie | null }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(maandag);
    d.setDate(d.getDate() + i);
    const ds = isoDatum(d);
    dagen.push({ datum: ds, reg: regs.find((r) => r.datum === ds) ?? null });
  }

  // Weekend- en bouwverlof-uren tellen volledig als overuren; gewone uren pas
  // boven de weekstandaard.
  const gewoonUren = regs
    .filter((r) => (r.soort ?? "gewoon") === "gewoon")
    .reduce((s, r) => s + (r.gewerkte_uren ?? 0), 0);
  const extraUren = regs
    .filter((r) => (r.soort ?? "gewoon") !== "gewoon")
    .reduce((s, r) => s + (r.gewerkte_uren ?? 0), 0);
  const totaal = gewoonUren + extraUren;
  const norm = werknemer!.standaard_uren_per_week;
  const overuren = extraUren + Math.max(0, gewoonUren - norm);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mijn week</h1>
          <p className="text-sm text-slate-500">
            Week {week} · {jaar}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href={`/week?offset=${offset + 1}`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
          >
            ← Vorige
          </Link>
          {offset > 0 && (
            <Link
              href={`/week?offset=${offset - 1}`}
              className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
            >
              Volgende →
            </Link>
          )}
        </div>
      </div>

      {offset === 0 && <MeldingenAanzetten />}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Dag</th>
              <th className="px-4 py-2 font-medium">In</th>
              <th className="px-4 py-2 font-medium">Uit</th>
              <th className="px-4 py-2 text-right font-medium">Uren</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dagen.map((d) => (
              <tr key={d.datum}>
                <td className="px-4 py-2.5 text-slate-700">
                  {toonDatum(d.datum)}
                  {d.reg && (d.reg.soort ?? "gewoon") !== "gewoon" && (
                    <span className="ml-1 rounded bg-merk-licht px-1.5 py-0.5 text-[10px] font-medium text-merk">
                      {d.reg.soort}
                    </span>
                  )}
                  {d.reg?.handmatig_aangepast && (
                    <span className="ml-1 text-amber-500" title="Aangepast">
                      ✎
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-500">
                  {toonTijd(d.reg?.checkin ?? null)}
                </td>
                <td className="px-4 py-2.5 text-slate-500">
                  {toonTijd(d.reg?.checkout ?? null)}
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                  {toonUren(d.reg?.gewerkte_uren ?? null)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50">
            <tr>
              <td colSpan={3} className="px-4 py-2.5 font-medium text-slate-700">
                Totaal
              </td>
              <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                {toonUren(totaal)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 py-2.5 text-slate-600">
                Overuren (weekend/bouwverlof + boven {toonUren(norm)})
              </td>
              <td className="px-4 py-2.5 text-right font-bold text-merk">
                {toonUren(overuren)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {bevestigd ? (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700">
          ✓ Deze week is bevestigd.
        </div>
      ) : (
        <form action={bevestigWeek}>
          <input type="hidden" name="jaar" value={jaar} />
          <input type="hidden" name="week" value={week} />
          <input type="hidden" name="totaal" value={totaal.toFixed(2)} />
          <input type="hidden" name="overuren" value={overuren.toFixed(2)} />
          <input type="hidden" name="van" value={maandagStr} />
          <input type="hidden" name="tot" value={zondagStr} />
          <button className="w-full rounded-xl bg-merk py-3 font-semibold text-white transition hover:bg-merk-donker">
            Week bevestigen
          </button>
        </form>
      )}
    </div>
  );
}
