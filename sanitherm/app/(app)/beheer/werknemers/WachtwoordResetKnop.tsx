"use client";

import { useActionState, useState } from "react";
import { wachtwoordOpnieuw } from "./actions";
import type { ResetResultaat } from "./types";

export default function WachtwoordResetKnop({
  id,
  naam,
}: {
  id: string;
  naam: string;
}) {
  const [resultaat, formAction, bezig] = useActionState<
    ResetResultaat | null,
    FormData
  >(wachtwoordOpnieuw, null);
  const [gekopieerd, setGekopieerd] = useState(false);

  async function kopieer(wachtwoord: string) {
    try {
      await navigator.clipboard.writeText(wachtwoord);
      setGekopieerd(true);
      setTimeout(() => setGekopieerd(false), 2000);
    } catch {
      // klembord niet beschikbaar — negeren
    }
  }

  if (resultaat?.ok) {
    return (
      <div className="rounded-lg bg-merk-licht px-2.5 py-1.5 text-left ring-1 ring-merk/20">
        <span className="text-slate-600">Nieuw wachtwoord: </span>
        <span className="rounded bg-white px-1.5 py-0.5 font-mono font-medium text-slate-900 ring-1 ring-slate-200">
          {resultaat.wachtwoord}
        </span>
        <button
          type="button"
          onClick={() => kopieer(resultaat.wachtwoord)}
          className="ml-2 text-xs font-medium text-merk hover:underline"
        >
          {gekopieerd ? "gekopieerd ✓" : "kopieer"}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={bezig}
        title={`Nieuw wachtwoord voor ${naam}`}
        className="text-xs font-medium text-slate-500 hover:text-merk disabled:opacity-50"
      >
        {bezig ? "Bezig…" : "Nieuw wachtwoord"}
      </button>
      {resultaat && !resultaat.ok && (
        <span className="ml-2 text-xs text-red-600">{resultaat.fout}</span>
      )}
    </form>
  );
}
