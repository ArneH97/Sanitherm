import { createClient } from "@/lib/supabase/server";
import { huidigeWerknemer } from "@/lib/werknemer";
import { attestSignedUrls } from "@/lib/attest";
import { toonDatum } from "@/lib/uren";
import type { Ziektemelding } from "@/lib/types";
import ZiekForm from "./ZiekForm";
import { attestToevoegen } from "./actions";

export const dynamic = "force-dynamic";

export default async function ZiekPagina() {
  const ik = await huidigeWerknemer();
  const supabase = await createClient();

  const { data } = await supabase
    .from("ziektemeldingen")
    .select("*")
    .eq("werknemer_id", ik!.id)
    .order("gemeld_op", { ascending: false })
    .limit(20);
  const meldingen = (data as Ziektemelding[]) ?? [];

  const urls = await attestSignedUrls(meldingen.map((m) => m.attest_pad));
  const metUrl = meldingen.map((m, i) => ({ melding: m, url: urls[i] }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Ziek melden</h1>
        <p className="text-sm text-slate-500">
          Meld je ziekteperiode en laad je attest op.
        </p>
      </div>

      <ZiekForm />

      <div>
        <h2 className="mb-2 text-base font-semibold text-slate-900">
          Mijn ziekmeldingen
        </h2>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <ul className="divide-y divide-slate-100">
            {metUrl.map(({ melding: m, url }) => (
              <li key={m.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">
                      {toonDatum(m.van)}
                      {m.tot ? ` – ${toonDatum(m.tot)}` : " (geen einddatum)"}
                    </p>
                    <p className="text-sm text-slate-500">
                      Gemeld op {toonDatum(m.gemeld_op.slice(0, 10))}
                    </p>
                  </div>
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-sm font-medium text-merk hover:underline"
                    >
                      Attest bekijken
                    </a>
                  )}
                </div>

                {!url && (
                  <form
                    action={attestToevoegen}
                    className="mt-2 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200"
                  >
                    <input type="hidden" name="id" value={m.id} />
                    <p className="mb-2 text-xs font-medium text-amber-700">
                      Nog geen attest — voeg het binnen de 24 uur toe:
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        name="attest"
                        type="file"
                        accept="image/*,application/pdf"
                        required
                        className="text-sm text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-white file:px-2 file:py-1 file:text-xs file:font-medium file:text-merk"
                      />
                      <button className="rounded-lg bg-merk px-3 py-1.5 text-sm font-medium text-white hover:bg-merk-donker">
                        Attest toevoegen
                      </button>
                    </div>
                  </form>
                )}
              </li>
            ))}
            {metUrl.length === 0 && (
              <li className="px-4 py-6 text-center text-slate-400">
                Nog geen ziekmeldingen.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
