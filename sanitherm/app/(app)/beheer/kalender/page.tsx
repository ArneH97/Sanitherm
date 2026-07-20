import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  vandaagInBrussel,
  maandGrid,
  toonMaand,
  maandVerschuif,
  toonDatum,
} from "@/lib/uren";
import { VERLOF_LABELS, type VerlofType } from "@/lib/types";

export const dynamic = "force-dynamic";

type Aanvraag = {
  id: string;
  werknemer_id: string;
  type: VerlofType;
  van: string;
  tot: string;
  status: string;
  werknemer: { naam: string } | null;
};

type Bouw = { id: string; omschrijving: string; van: string; tot: string };

// Kleurenpalet — elke werknemer krijgt een eigen, herkenbare kleur.
const PALET = [
  "#2563eb", "#16a34a", "#db2777", "#ea580c", "#7c3aed", "#0891b2",
  "#b45309", "#dc2626", "#4f46e5", "#0d9488", "#c026d3", "#65a30d",
];

const WEEKDAGEN = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

export default async function KalenderPagina({
  searchParams,
}: {
  searchParams: Promise<{ maand?: string }>;
}) {
  const params = await searchParams;
  const vandaag = vandaagInBrussel();
  const maand =
    params.maand && /^\d{4}-\d{2}$/.test(params.maand)
      ? params.maand
      : vandaag.slice(0, 7);

  const dagen = maandGrid(maand);
  const eersteDag = dagen[0];
  const laatsteDag = dagen[41];

  const supabase = await createClient();
  const [aanvraagRes, bouwRes] = await Promise.all([
    supabase
      .from("verlofaanvragen")
      .select(
        "id, werknemer_id, type, van, tot, status, werknemer:werknemers!werknemer_id(naam)"
      )
      .in("status", ["goedgekeurd", "aangevraagd"])
      .lte("van", laatsteDag)
      .gte("tot", eersteDag),
    supabase
      .from("bouwverlof")
      .select("id, omschrijving, van, tot")
      .lte("van", laatsteDag)
      .gte("tot", eersteDag),
  ]);

  const aanvragen = (aanvraagRes.data as unknown as Aanvraag[]) ?? [];
  const bouw = (bouwRes.data as Bouw[]) ?? [];

  // Kleur per werknemer (stabiel op naam gesorteerd).
  const werknemers = Array.from(
    new Map(
      aanvragen.map((a) => [a.werknemer_id, a.werknemer?.naam ?? "Onbekend"])
    ).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));
  const kleurVan = new Map<string, string>();
  werknemers.forEach(([id], i) => kleurVan.set(id, PALET[i % PALET.length]));

  const voornaam = (naam: string) => naam.split(" ")[0];
  const inMaand = (d: string) => d.slice(0, 7) === maand;
  const isWeekend = (d: string) => {
    const dow = new Date(d + "T12:00:00Z").getUTCDay();
    return dow === 0 || dow === 6;
  };
  const bouwOp = (d: string) => bouw.find((b) => d >= b.van && d <= b.tot);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Verlofkalender</h1>
          <p className="text-sm capitalize text-slate-500">{toonMaand(maand)}</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/beheer/kalender?maand=${maandVerschuif(maand, -1)}`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
          >
            ← Vorige
          </Link>
          <Link
            href="/beheer/kalender"
            className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
          >
            Vandaag
          </Link>
          <Link
            href={`/beheer/kalender?maand=${maandVerschuif(maand, 1)}`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
          >
            Volgende →
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {/* Weekdagen */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold uppercase text-slate-400">
          {WEEKDAGEN.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        {/* Dagen */}
        <div className="grid grid-cols-7">
          {dagen.map((d) => {
            const dagAanvragen = aanvragen.filter(
              (a) => d >= a.van && d <= a.tot
            );
            const b = bouwOp(d);
            const isVandaag = d === vandaag;
            return (
              <div
                key={d}
                className={`min-h-[92px] border-b border-r border-slate-100 p-1.5 align-top ${
                  isWeekend(d) ? "bg-slate-50/70" : ""
                } ${inMaand(d) ? "" : "bg-slate-50 text-slate-300"}`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                      isVandaag
                        ? "bg-merk text-white"
                        : inMaand(d)
                          ? "text-slate-600"
                          : "text-slate-300"
                    }`}
                  >
                    {Number(d.slice(8, 10))}
                  </span>
                </div>

                {b && (
                  <div
                    className="mb-1 truncate rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700"
                    title={`Bouwverlof: ${b.omschrijving}`}
                  >
                    Bouwverlof
                  </div>
                )}

                <div className="space-y-1">
                  {dagAanvragen.slice(0, 3).map((a) => {
                    const kleur = kleurVan.get(a.werknemer_id) ?? "#64748b";
                    const goedgekeurd = a.status === "goedgekeurd";
                    return (
                      <div
                        key={a.id}
                        title={`${a.werknemer?.naam ?? "Onbekend"} — ${
                          VERLOF_LABELS[a.type]
                        } (${a.status === "goedgekeurd" ? "goedgekeurd" : "aangevraagd"})`}
                        className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={
                          goedgekeurd
                            ? { backgroundColor: kleur, color: "#fff" }
                            : {
                                backgroundColor: "#fff",
                                color: kleur,
                                border: `1px dashed ${kleur}`,
                              }
                        }
                      >
                        {voornaam(a.werknemer?.naam ?? "?")}
                      </div>
                    );
                  })}
                  {dagAanvragen.length > 3 && (
                    <div className="px-1 text-[10px] font-medium text-slate-400">
                      +{dagAanvragen.length - 3} meer
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legende */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Legende
        </p>
        {werknemers.length === 0 ? (
          <p className="text-sm text-slate-400">
            Geen verlof in deze maand.
          </p>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {werknemers.map(([id, naam]) => (
              <span key={id} className="flex items-center gap-2 text-sm text-slate-700">
                <span
                  className="inline-block h-3 w-3 rounded"
                  style={{ backgroundColor: kleurVan.get(id) }}
                />
                {naam}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-5 rounded bg-slate-400" /> goedgekeurd
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-5 rounded border border-dashed border-slate-400 bg-white" />
            aangevraagd
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-5 rounded bg-amber-100" /> bouwverlof
          </span>
        </div>
      </div>
    </div>
  );
}
