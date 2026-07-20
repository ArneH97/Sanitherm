import { createClient } from "@/lib/supabase/server";
import type { Werknemer } from "@/lib/types";
import WerknemerToevoegen from "./WerknemerToevoegen";
import { arbeiderActiefWisselen } from "./actions";

export const dynamic = "force-dynamic";

export default async function WerknemersPagina() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("werknemers")
    .select("*")
    .eq("rol", "arbeider")
    .order("naam");
  const werknemers = (data as Werknemer[]) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Werknemers</h1>
        <p className="text-sm text-slate-500">
          Beheer de arbeiders van Sanitherm.
        </p>
      </div>

      <WerknemerToevoegen />

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Naam</th>
              <th className="px-4 py-2 font-medium">E-mail</th>
              <th className="px-4 py-2 text-right font-medium">Uurloon</th>
              <th className="px-4 py-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {werknemers.map((w) => (
              <tr key={w.id} className={w.actief ? "" : "bg-slate-50"}>
                <td className="px-4 py-2.5 font-medium text-slate-800">
                  {w.naam}
                </td>
                <td className="px-4 py-2.5 text-slate-500">{w.email}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">
                  {w.uurloon != null
                    ? "€ " + w.uurloon.toFixed(2).replace(".", ",")
                    : "—"}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <form action={arbeiderActiefWisselen} className="inline">
                    <input type="hidden" name="id" value={w.id} />
                    <input
                      type="hidden"
                      name="actief"
                      value={w.actief ? "false" : "true"}
                    />
                    {w.actief ? (
                      <button className="text-xs font-medium text-slate-500 hover:text-red-600">
                        Actief · zet inactief
                      </button>
                    ) : (
                      <button className="text-xs font-medium text-red-500 hover:text-merk">
                        Inactief · heractiveer
                      </button>
                    )}
                  </form>
                </td>
              </tr>
            ))}
            {werknemers.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-slate-400"
                >
                  Nog geen arbeiders. Voeg er hierboven een toe.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        Het uurrooster, de verloftellers en de pdf-export per werknemer komen in
        een volgende fase.
      </p>
    </div>
  );
}
