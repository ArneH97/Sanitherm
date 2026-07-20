"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPagina() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  async function aanmelden(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);
    setBezig(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: wachtwoord,
    });
    if (error) {
      setFout("Aanmelden mislukt. Controleer je e-mail en wachtwoord.");
      setBezig(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-merk">Sanitherm</h1>
          <p className="mt-1 text-sm text-slate-500">Personeelsportaal</p>
        </div>

        <form onSubmit={aanmelden} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-merk focus:ring-2 focus:ring-merk/30"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Wachtwoord
            </label>
            <input
              type="password"
              required
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-merk focus:ring-2 focus:ring-merk/30"
              autoComplete="current-password"
            />
          </div>

          {fout && <p className="text-sm text-red-600">{fout}</p>}

          <button
            type="submit"
            disabled={bezig}
            className="w-full rounded-lg bg-merk py-2.5 font-medium text-white transition hover:bg-merk-donker disabled:opacity-60"
          >
            {bezig ? "Bezig…" : "Aanmelden"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Nog geen account? Vraag je werkgever om je toe te voegen.
        </p>
      </div>
    </main>
  );
}
