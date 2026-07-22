import { createClient } from "@/lib/supabase/server";
import { huidigeWerknemer } from "@/lib/werknemer";
import { overurenSaldo } from "@/lib/verlof";
import { vandaagInBrussel, toonDatum, toonUren } from "@/lib/uren";
import {
  VERLOF_LABELS,
  STATUS_LABELS,
  DAGDEEL_LABELS,
  type Verlofaanvraag,
  type Verloftellers,
  type AanvraagStatus,
} from "@/lib/types";
import VerlofForm from "./VerlofForm";
import { verlofAnnuleren } from "./actions";

export const dynamic = "force-dynamic";

type Bouwverlof = {
  id: string;
  jaar: number;
  provincie: string;
  omschrijving: string;
  van: string;
  tot: string;
};

export default async function VerlofPagina() {
  const ik = await huidigeWerknemer();
  const supabase = await createClient();
  const jaar = Number(vandaagInBrussel().slice(0, 4));

  const [saldo, tellerRes, aanvraagRes, bouwRes] = await Promise.all([
    overurenSaldo(ik!),
    supabase
      .from("verloftellers")
      .select("*")
      .eq("werknemer_id", ik!.id)
      .eq("jaar", jaar)
      .maybeSingle(),
    supabase
      .from("verlofaanvragen")
      .select("*")
      .eq("werknemer_id", ik!.id)
      .order("aangevraagd_op", { ascending: false })
      .limit(20),
    supabase
      .from("bouwverlof")
      .select("*")
      .eq("jaar", jaar)
      .eq("provincie", ik!.provincie)
      .order("van"),
  ]);

  const teller = tellerRes.data as Verloftellers | null;
  const aanvragen = (aanvraagRes.data as Verlofaanvraag[]) ?? [];
  const bouwverlof = (bouwRes.data as Bouwverlof[]) ?? [];

  const wettelijkRest = teller
    ? teller.wettelijk_verlof_totaal - teller.wettelijk_verlof_opgenomen
    : null;
  const advRest = teller ? teller.adv_totaal - teller.adv_opgenomen : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Verlof</h1>
        <p className="text-sm text-slate-500">Jaar {jaar}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Teller
          label="Wettelijk verlof"
          waarde={wettelijkRest != null ? `${wettelijkRest} d` : "—"}
          onder={teller ? `van ${teller.wettelijk_verlof_totaal} d` : "niet ingesteld"}
        />
        <Teller
          label="ADV-inhaalrust"
          waarde={advRest != null ? `${advRest} d` : "—"}
          onder={teller ? `van ${teller.adv_totaal} d` : "niet ingesteld"}
        />
        <Teller
          label="Overuren"
          waarde={toonUren(saldo.beschikbaar)}
          onder={`opgebouwd ${toonUren(saldo.opgebouwd)}`}
        />
      </div>

      <VerlofForm
        overurenBeschikbaar={saldo.beschikbaar}
        urenPerDag={Number(ik!.standaard_uren_per_dag)}
      />

      {bouwverlof.length > 0 && (
        <div className="rounded-2xl bg-merk-licht p-4 ring-1 ring-merk/20">
          <p className="text-sm font-semibold text-slate-900">
            Bouwverlof {jaar} — {ik!.provincie}
          </p>
          {bouwverlof.map((b) => (
            <p key={b.id} className="mt-1 text-sm text-slate-600">
              {b.omschrijving}: {toonDatum(b.van)} t.e.m. {toonDatum(b.tot)}
            </p>
          ))}
          <p className="mt-2 text-xs text-slate-500">
            Tijdens deze collectieve sluiting is er geen werk.
          </p>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-base font-semibold text-slate-900">
          Mijn aanvragen
        </h2>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <ul className="divide-y divide-slate-100">
            {aanvragen.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">
                    {VERLOF_LABELS[a.type]}
                  </p>
                  <p className="text-sm text-slate-500">
                    {a.dagdeel !== "hele_dag"
                      ? `${toonDatum(a.van)} · ${DAGDEEL_LABELS[a.dagdeel]}`
                      : `${toonDatum(a.van)} – ${toonDatum(a.tot)}`}{" "}
                    · {a.aantal_dagen} dag{a.aantal_dagen === 1 ? "" : "en"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={a.status} />
                  {a.status === "aangevraagd" && (
                    <form action={verlofAnnuleren} className="inline">
                      <input type="hidden" name="id" value={a.id} />
                      <button className="text-xs font-medium text-slate-400 hover:text-red-600">
                        Annuleren
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
            {aanvragen.length === 0 && (
              <li className="px-4 py-6 text-center text-slate-400">
                Nog geen aanvragen.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Teller({
  label,
  waarde,
  onder,
}: {
  label: string;
  waarde: string;
  onder: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-200">
      <p className="text-xl font-bold text-slate-900">{waarde}</p>
      <p className="mt-1 text-xs font-medium text-slate-600">{label}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{onder}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: AanvraagStatus }) {
  const stijl: Record<AanvraagStatus, string> = {
    aangevraagd: "bg-amber-100 text-amber-700",
    goedgekeurd: "bg-emerald-100 text-emerald-700",
    geweigerd: "bg-red-100 text-red-700",
    geannuleerd: "bg-slate-100 text-slate-500",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${stijl[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
