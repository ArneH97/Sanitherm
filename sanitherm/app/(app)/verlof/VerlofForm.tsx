"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { verlofAanvragen } from "./actions";
import type { AanvraagResultaat } from "./types";
import { toonUren } from "@/lib/uren";
import {
  AANVRAAGBARE_VERLOF_TYPES,
  VERLOF_LABELS,
  VERLOF_HINTS,
  DAGDEEL_LABELS,
  type VerlofType,
  type Dagdeel,
} from "@/lib/types";

const DAGDELEN: Dagdeel[] = ["hele_dag", "voormiddag", "namiddag"];

export default function VerlofForm({
  overurenBeschikbaar,
  urenPerDag,
}: {
  overurenBeschikbaar: number;
  urenPerDag: number;
}) {
  const [resultaat, formAction, bezig] = useActionState<
    AanvraagResultaat | null,
    FormData
  >(verlofAanvragen, null);

  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<VerlofType>("wettelijk_verlof");
  const [dagdeel, setDagdeel] = useState<Dagdeel>("hele_dag");
  const halveDag = dagdeel !== "hele_dag";

  useEffect(() => {
    if (resultaat?.ok) {
      formRef.current?.reset();
      setType("wettelijk_verlof");
      setDagdeel("hele_dag");
    }
  }, [resultaat]);

  const inputKlasse =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-merk focus:ring-2 focus:ring-merk/30";

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-base font-semibold text-slate-900">
        Verlof aanvragen
      </h2>

      <form ref={formRef} action={formAction} className="mt-4 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Soort
          </span>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as VerlofType)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-merk focus:ring-2 focus:ring-merk/30"
          >
            {AANVRAAGBARE_VERLOF_TYPES.map((t) => (
              <option key={t} value={t}>
                {VERLOF_LABELS[t]}
              </option>
            ))}
          </select>
          {type === "overuren" && (
            <span className="mt-1 block text-xs text-slate-500">
              Beschikbaar overuren-saldo:{" "}
              <span className="font-medium text-merk">
                {toonUren(overurenBeschikbaar)}
              </span>{" "}
              (≈ {(overurenBeschikbaar / urenPerDag).toFixed(1)} dagen)
            </span>
          )}
          {VERLOF_HINTS[type] && (
            <span className="mt-1 block text-xs text-slate-500">
              {VERLOF_HINTS[type]}
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Duur
          </span>
          <select
            name="dagdeel"
            value={dagdeel}
            onChange={(e) => setDagdeel(e.target.value as Dagdeel)}
            className={inputKlasse}
          >
            {DAGDELEN.map((d) => (
              <option key={d} value={d}>
                {DAGDEEL_LABELS[d]}
              </option>
            ))}
          </select>
        </label>

        {halveDag ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Dag
            </span>
            <input name="van" type="date" required className={inputKlasse} />
          </label>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Van
              </span>
              <input name="van" type="date" required className={inputKlasse} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Tot en met
              </span>
              <input name="tot" type="date" required className={inputKlasse} />
            </label>
          </div>
        )}

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Reden (optioneel)
          </span>
          <textarea
            name="reden"
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-merk focus:ring-2 focus:ring-merk/30"
          />
        </label>

        {resultaat && !resultaat.ok && (
          <p className="text-sm text-red-600">{resultaat.fout}</p>
        )}
        {resultaat?.ok && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            Aanvraag ingediend
            {resultaat.dagen === 0.5
              ? " (halve dag)"
              : ` voor ${resultaat.dagen} werkdag${
                  resultaat.dagen === 1 ? "" : "en"
                }`}
            . Bart kan ze nu beoordelen.
          </p>
        )}

        <button
          type="submit"
          disabled={bezig}
          className="rounded-lg bg-merk px-4 py-2.5 font-medium text-white transition hover:bg-merk-donker disabled:opacity-60"
        >
          {bezig ? "Bezig…" : "Aanvraag indienen"}
        </button>

        <p className="text-xs text-slate-400">
          Alleen werkdagen (ma–vr) worden geteld. Weekends tellen niet mee.
        </p>
      </form>
    </div>
  );
}
