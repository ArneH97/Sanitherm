"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { arbeiderToevoegen } from "./actions";
import type { ToevoegenResultaat } from "./types";

export default function WerknemerToevoegen() {
  const [resultaat, formAction, bezig] = useActionState<
    ToevoegenResultaat | null,
    FormData
  >(arbeiderToevoegen, null);

  const formRef = useRef<HTMLFormElement>(null);
  const [gekopieerd, setGekopieerd] = useState(false);

  // Formulier leegmaken na een geslaagde toevoeging.
  useEffect(() => {
    if (resultaat?.ok) {
      formRef.current?.reset();
      setGekopieerd(false);
    }
  }, [resultaat]);

  async function kopieer(tekst: string) {
    try {
      await navigator.clipboard.writeText(tekst);
      setGekopieerd(true);
      setTimeout(() => setGekopieerd(false), 2000);
    } catch {
      // klembord niet beschikbaar — negeren
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-base font-semibold text-slate-900">
        Arbeider toevoegen
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Er wordt meteen een account aangemaakt. Geef de arbeider het tijdelijke
        wachtwoord door — daarmee kan hij zich aanmelden.
      </p>

      <form ref={formRef} action={formAction} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Veld label="Naam" verplicht>
            <input
              name="naam"
              required
              autoComplete="off"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-merk focus:ring-2 focus:ring-merk/30"
            />
          </Veld>
          <Veld label="E-mail" verplicht>
            <input
              name="email"
              type="email"
              required
              autoComplete="off"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-merk focus:ring-2 focus:ring-merk/30"
            />
          </Veld>
          <Veld label="Startdatum (optioneel)">
            <input
              name="startdatum"
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-merk focus:ring-2 focus:ring-merk/30"
            />
          </Veld>
        </div>

        <Veld label="Tijdelijk wachtwoord (leeg = automatisch)">
          <input
            name="wachtwoord"
            autoComplete="off"
            placeholder="Laat leeg om er een te genereren"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-merk focus:ring-2 focus:ring-merk/30"
          />
        </Veld>

        {resultaat && !resultaat.ok && (
          <p className="text-sm text-red-600">{resultaat.fout}</p>
        )}

        <button
          type="submit"
          disabled={bezig}
          className="rounded-lg bg-merk px-4 py-2.5 font-medium text-white transition hover:bg-merk-donker disabled:opacity-60"
        >
          {bezig ? "Bezig…" : "Arbeider toevoegen"}
        </button>
      </form>

      {resultaat?.ok && (
        <div className="mt-4 rounded-xl bg-merk-licht p-4 ring-1 ring-merk/20">
          <p className="text-sm font-medium text-slate-900">
            {resultaat.naam} is toegevoegd.
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Bezorg deze aanmeldgegevens aan de arbeider:
          </p>
          <div className="mt-3 space-y-1 text-sm">
            <p className="text-slate-600">
              E-mail:{" "}
              <span className="font-medium text-slate-900">
                {resultaat.email}
              </span>
            </p>
            <p className="text-slate-600">
              Wachtwoord:{" "}
              <span className="rounded bg-white px-2 py-0.5 font-mono font-medium text-slate-900 ring-1 ring-slate-200">
                {resultaat.wachtwoord}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              kopieer(
                `Aanmelden Sanitherm\nE-mail: ${resultaat.email}\nWachtwoord: ${resultaat.wachtwoord}`
              )
            }
            className="mt-3 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-merk ring-1 ring-merk/30 transition hover:bg-merk hover:text-white"
          >
            {gekopieerd ? "Gekopieerd ✓" : "Gegevens kopiëren"}
          </button>
          <p className="mt-3 text-xs text-slate-500">
            Dit wachtwoord wordt maar één keer getoond. Kopieer het nu.
          </p>
        </div>
      )}
    </div>
  );
}

function Veld({
  label,
  verplicht,
  children,
}: {
  label: string;
  verplicht?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {verplicht && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
