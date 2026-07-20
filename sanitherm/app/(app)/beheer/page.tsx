import { createClient } from "@/lib/supabase/server";
import { vandaagInBrussel, toonTijd, toonDatum } from "@/lib/uren";
import type { Tijdsregistratie, Werknemer } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BeheerOverzicht() {
  const supabase = await createClient();
  const datum = vandaagInBrussel();

  const { data: wData } = await supabase
    .from("werknemers")
    .select("*")
    .eq("rol", "arbeider")
    .eq("actief", true)
    .order("naam");
  const werknemers = (wData as Werknemer[]) ?? [];

  const { data: rData } = await supabase
    .from("tijdsregistraties")
    .select("*")
    .eq("datum", datum);
  const regs = (rData as Tijdsregistratie[]) ?? [];

  const { count: openAanvragen } = await supabase
    .from("verlofaanvragen")
    .select("id", { count: "exact", head: true })
    .eq("status", "aangevraagd");

  const regVoor = (id: string) =>
    regs.find((r) => r.werknemer_id === id) ?? null;
  const aanwezig = regs.filter((r) => r.checkin && !r.checkout).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Overzicht</h1>
        <p className="text-sm text-slate-500">{toonDatum(datum)}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Tegel label="Arbeiders" waarde={werknemers.length} />
        <Tegel label="Nu aanwezig" waarde={aanwezig} />
        <Tegel label="Openstaande aanvragen" waarde={openAanvragen ?? 0} />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Werknemer</th>
              <th className="px-4 py-2 font-medium">In</th>
              <th className="px-4 py-2 font-medium">Uit</th>
              <th className="px-4 py-2 text-right font-medium">Uren</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {werknemers.map((w) => {
              const r = regVoor(w.id);
              return (
                <tr key={w.id}>
                  <td className="px-4 py-2.5 text-slate-700">{w.naam}</td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {toonTijd(r?.checkin ?? null)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {toonTijd(r?.checkout ?? null)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                    {r?.gewerkte_uren != null
                      ? r.gewerkte_uren.toFixed(2)
                      : "—"}
                  </td>
                </tr>
              );
            })}
            {werknemers.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-slate-400"
                >
                  Nog geen arbeiders toegevoegd.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        Goedkeuringen, per-werknemer-instellingen en de pdf-export komen in de
        volgende fase.
      </p>
    </div>
  );
}

function Tegel({ label, waarde }: { label: string; waarde: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-200">
      <p className="text-2xl font-bold text-slate-900">{waarde}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
