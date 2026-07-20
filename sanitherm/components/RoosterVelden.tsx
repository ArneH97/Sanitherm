import { ROOSTER_DAGEN, type RoosterDag } from "@/lib/types";

// Herbruikbaar invulblok voor het weekschema (uren per dag).
// Werkt zowel in server- als client-formulieren: het zijn gewone inputs
// met defaultValue, dus geen client-state nodig.
export default function RoosterVelden({
  waarden,
}: {
  waarden?: Partial<Record<RoosterDag, number>>;
}) {
  const standaard: Record<RoosterDag, number> = {
    ma: 8,
    di: 8,
    wo: 8,
    do: 8,
    vr: 8,
    za: 0,
    zo: 0,
  };

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        Weekschema (uren per dag)
      </span>
      <div className="grid grid-cols-7 gap-1.5">
        {ROOSTER_DAGEN.map((d) => (
          <label key={d.key} className="block text-center">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              {d.label}
            </span>
            <input
              name={`rooster_${d.key}`}
              inputMode="decimal"
              defaultValue={waarden?.[d.key] ?? standaard[d.key]}
              className="w-full rounded-lg border border-slate-300 px-1 py-2 text-center text-slate-900 outline-none focus:border-merk focus:ring-2 focus:ring-merk/30"
            />
          </label>
        ))}
      </div>
      <span className="mt-1 block text-xs text-slate-400">
        De weekstandaard (voor overuren) is de som van deze dagen.
      </span>
    </div>
  );
}
