import { createClient } from "@/lib/supabase/server";
import type { Werknemer } from "@/lib/types";

// Overzicht van het overuren-saldo van een werknemer, uitgedrukt in uren.
// - opgebouwd  : som van de overuren uit alle bevestigde weken
// - opgenomen  : overuren die als inhaalrust zijn opgenomen (verlofaanvragen
//                van het type 'overuren' met status aangevraagd of goedgekeurd)
// - beschikbaar: opgebouwd - opgenomen
export interface OverurenSaldo {
  opgebouwd: number; // uit bevestigde weken
  opgenomen: number; // als inhaalrust opgenomen (verlof van overuren)
  uitbetaald: number; // door de zaakvoerder uitbetaald
  beschikbaar: number; // opgebouwd - opgenomen - uitbetaald
}

export async function overurenSaldo(
  werknemer: Werknemer
): Promise<OverurenSaldo> {
  const supabase = await createClient();

  // De queries hebben elkaar niet nodig: parallel uitvoeren.
  const [wekenRes, aanvragenRes, uitbetRes] = await Promise.all([
    supabase
      .from("weekbevestigingen")
      .select("overuren, bevestigd_op")
      .eq("werknemer_id", werknemer.id),
    supabase
      .from("verlofaanvragen")
      .select("aantal_dagen, status")
      .eq("werknemer_id", werknemer.id)
      .eq("type", "overuren")
      .in("status", ["aangevraagd", "goedgekeurd"]),
    supabase
      .from("overuren_uitbetalingen")
      .select("uren")
      .eq("werknemer_id", werknemer.id),
  ]);

  // Opgebouwd: overuren uit bevestigde weken.
  const weken = wekenRes.data;
  const opgebouwd = (weken ?? [])
    .filter((w) => w.bevestigd_op)
    .reduce((s, w) => s + Number(w.overuren ?? 0), 0);

  // Opgenomen: dagen inhaalrust × standaard uren per dag.
  const aanvragen = aanvragenRes.data;
  const opgenomenDagen = (aanvragen ?? []).reduce(
    (s, a) => s + Number(a.aantal_dagen ?? 0),
    0
  );
  const opgenomen = opgenomenDagen * Number(werknemer.standaard_uren_per_dag);

  // Uitbetaald: som van de uitbetaalde uren.
  const uitbetaald = (uitbetRes.data ?? []).reduce(
    (s, u) => s + Number(u.uren ?? 0),
    0
  );

  const rond = (n: number) => Math.round(n * 100) / 100;

  return {
    opgebouwd: rond(opgebouwd),
    opgenomen: rond(opgenomen),
    uitbetaald: rond(uitbetaald),
    beschikbaar: rond(opgebouwd - opgenomen - uitbetaald),
  };
}
