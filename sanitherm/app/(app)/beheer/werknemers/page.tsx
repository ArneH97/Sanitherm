import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Werknemer } from "@/lib/types";
import WerknemerToevoegen from "./WerknemerToevoegen";
import WachtwoordResetKnop from "./WachtwoordResetKnop";
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
        <ul className="divide-y divide-slate-100">
          {werknemers.map((w) => (
            <li
              key={w.id}
              className={`px-4 py-3 ${w.actief ? "" : "bg-slate-50"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <Link
                  href={`/beheer/werknemers/${w.id}`}
                  className="group min-w-0 flex-1"
                >
                  <p className="font-medium text-slate-800 group-hover:text-merk">
                    {w.naam}
                    {!w.actief && (
                      <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-500">
                        inactief
                      </span>
                    )}
                    <span className="ml-1 text-slate-300 group-hover:text-merk">
                      ›
                    </span>
                  </p>
                  <p className="truncate text-sm text-slate-500">{w.email}</p>
                </Link>
                <div className="flex items-center gap-4">
                  <WachtwoordResetKnop id={w.id} naam={w.naam} />
                  <form action={arbeiderActiefWisselen} className="inline">
                    <input type="hidden" name="id" value={w.id} />
                    <input
                      type="hidden"
                      name="actief"
                      value={w.actief ? "false" : "true"}
                    />
                    {w.actief ? (
                      <button className="text-xs font-medium text-slate-500 hover:text-red-600">
                        Zet inactief
                      </button>
                    ) : (
                      <button className="text-xs font-medium text-red-500 hover:text-merk">
                        Heractiveer
                      </button>
                    )}
                  </form>
                </div>
              </div>
            </li>
          ))}
          {werknemers.length === 0 && (
            <li className="px-4 py-6 text-center text-slate-400">
              Nog geen arbeiders. Voeg er hierboven een toe.
            </li>
          )}
        </ul>
      </div>

      <p className="text-xs text-slate-400">
        Het uurrooster, de verloftellers en de pdf-export per werknemer komen in
        een volgende fase.
      </p>
    </div>
  );
}
