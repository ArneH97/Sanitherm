"use client";

import { useActionState } from "react";
import { wachtwoordInstellen } from "./actions";
import type { InstellenResultaat } from "./types";

export default function WachtwoordForm() {
  const [resultaat, formAction, bezig] = useActionState<
    InstellenResultaat | null,
    FormData
  >(wachtwoordInstellen, null);

  const inputKlasse =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-merk focus:ring-2 focus:ring-merk/30";

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Nieuw wachtwoord
        </span>
        <input
          name="wachtwoord"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputKlasse}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Herhaal wachtwoord
        </span>
        <input
          name="herhaal"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputKlasse}
        />
      </label>

      {resultaat?.fout && (
        <p className="text-sm text-red-600">{resultaat.fout}</p>
      )}

      <button
        type="submit"
        disabled={bezig}
        className="w-full rounded-lg bg-merk py-2.5 font-medium text-white transition hover:bg-merk-donker disabled:opacity-60"
      >
        {bezig ? "Bezig…" : "Wachtwoord instellen"}
      </button>
    </form>
  );
}
