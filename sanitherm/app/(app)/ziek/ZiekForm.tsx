"use client";

import { useActionState, useEffect, useRef } from "react";
import { ziekMelden } from "./actions";
import type { ZiekResultaat } from "./types";

export default function ZiekForm() {
  const [resultaat, formAction, bezig] = useActionState<
    ZiekResultaat | null,
    FormData
  >(ziekMelden, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resultaat?.ok) formRef.current?.reset();
  }, [resultaat]);

  const inputKlasse =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-merk focus:ring-2 focus:ring-merk/30";

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-base font-semibold text-slate-900">Ziek melden</h2>
      <p className="mt-1 text-sm text-slate-500">
        Geef de periode in en laad je doktersattest op. Bart wordt meteen
        verwittigd.
      </p>

      <form ref={formRef} action={formAction} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Van
            </span>
            <input name="van" type="date" required className={inputKlasse} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Tot en met (optioneel)
            </span>
            <input name="tot" type="date" className={inputKlasse} />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Attest (foto of pdf)
          </span>
          <input
            name="attest"
            type="file"
            accept="image/*,application/pdf"
            className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-merk-licht file:px-3 file:py-2 file:text-sm file:font-medium file:text-merk hover:file:bg-merk/10"
          />
          <span className="mt-1 block text-xs text-slate-400">
            Je kan het attest ook later nog toevoegen.
          </span>
        </label>

        {resultaat && !resultaat.ok && (
          <p className="text-sm text-red-600">{resultaat.fout}</p>
        )}
        {resultaat?.ok && resultaat.heeftAttest && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            Je ziekmelding en attest zijn doorgestuurd naar Bart.
          </p>
        )}
        {resultaat?.ok && !resultaat.heeftAttest && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
            Ziekmelding doorgestuurd. Vergeet niet je attest{" "}
            <b>binnen de 24 uur</b> toe te voegen (hieronder bij je melding).
          </p>
        )}

        <button
          type="submit"
          disabled={bezig}
          className="rounded-lg bg-merk px-4 py-2.5 font-medium text-white transition hover:bg-merk-donker disabled:opacity-60"
        >
          {bezig ? "Bezig…" : "Ziekmelding versturen"}
        </button>
      </form>
    </div>
  );
}
