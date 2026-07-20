import { createClient } from "@/lib/supabase/server";
import { vandaagInBrussel } from "@/lib/uren";
import type { Werknemer } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ExportPagina() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("werknemers")
    .select("id, naam")
    .eq("rol", "arbeider")
    .order("naam");
  const werknemers = (data as Pick<Werknemer, "id" | "naam">[]) ?? [];

  const vandaag = vandaagInBrussel();
  const eersteVanMaand = vandaag.slice(0, 8) + "01";

  const inputKlasse =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-merk focus:ring-2 focus:ring-merk/30";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Export</h1>
        <p className="text-sm text-slate-500">
          Download de tijdsregistraties van een werknemer als pdf.
        </p>
      </div>

      {werknemers.length === 0 ? (
        <div className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-200">
          Nog geen arbeiders om te exporteren.
        </div>
      ) : (
        <form
          action="/beheer/export/pdf"
          method="get"
          target="_blank"
          className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Werknemer
            </span>
            <select name="werknemer" required className={inputKlasse}>
              {werknemers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.naam}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Van
              </span>
              <input
                name="van"
                type="date"
                required
                defaultValue={eersteVanMaand}
                className={inputKlasse}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Tot en met
              </span>
              <input
                name="tot"
                type="date"
                required
                defaultValue={vandaag}
                className={inputKlasse}
              />
            </label>
          </div>

          <button className="rounded-lg bg-merk px-4 py-2.5 font-medium text-white transition hover:bg-merk-donker">
            Pdf downloaden
          </button>
          <p className="text-xs text-slate-400">
            De pdf opent in een nieuw tabblad; van daaruit kan je hem bewaren of
            printen.
          </p>
        </form>
      )}
    </div>
  );
}
