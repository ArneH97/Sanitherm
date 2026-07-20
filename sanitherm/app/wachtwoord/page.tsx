import { redirect } from "next/navigation";
import { huidigeWerknemer } from "@/lib/werknemer";
import WachtwoordForm from "./WachtwoordForm";

export const dynamic = "force-dynamic";

export default async function WachtwoordInstellenPagina() {
  const ik = await huidigeWerknemer();
  if (!ik) redirect("/login");
  // Al ingesteld? Dan hoeft dit scherm niet meer.
  if (ik.wachtwoord_ingesteld) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-merk">Sanitherm</h1>
          <p className="mt-1 text-sm text-slate-500">Stel je wachtwoord in</p>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          Welkom {ik.naam}! Kies een eigen, persoonlijk wachtwoord voordat je
          verdergaat. Zo kent enkel jij het.
        </p>

        <WachtwoordForm />
      </div>
    </main>
  );
}
