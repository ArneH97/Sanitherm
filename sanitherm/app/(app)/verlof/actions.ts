"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { huidigeWerknemer } from "@/lib/werknemer";
import { overurenSaldo } from "@/lib/verlof";
import { werkdagenTussen, toonUren } from "@/lib/uren";
import {
  AANVRAAGBARE_VERLOF_TYPES,
  type VerlofType,
  type Dagdeel,
} from "@/lib/types";
import type { AanvraagResultaat } from "./types";

export async function verlofAanvragen(
  _vorige: AanvraagResultaat | null,
  formData: FormData
): Promise<AanvraagResultaat> {
  const ik = await huidigeWerknemer();
  if (!ik) return { ok: false, fout: "Niet ingelogd." };

  const type = String(formData.get("type") ?? "") as VerlofType;
  const van = String(formData.get("van") ?? "").trim();
  let tot = String(formData.get("tot") ?? "").trim();
  const reden = String(formData.get("reden") ?? "").trim();
  const dagdeelRuw = String(formData.get("dagdeel") ?? "hele_dag");
  const dagdeel: Dagdeel =
    dagdeelRuw === "voormiddag" || dagdeelRuw === "namiddag"
      ? dagdeelRuw
      : "hele_dag";

  if (!AANVRAAGBARE_VERLOF_TYPES.includes(type)) {
    return { ok: false, fout: "Kies een geldige verlofsoort." };
  }
  const datumOk = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (!datumOk(van)) {
    return { ok: false, fout: "Vul een geldige begindatum in." };
  }

  // Een halve dag (voor-/namiddag) geldt voor één dag: einddatum = begindatum.
  const halveDag = dagdeel !== "hele_dag";
  if (halveDag) tot = van;
  if (!datumOk(tot)) {
    return { ok: false, fout: "Vul een geldige einddatum in." };
  }
  if (tot < van) {
    return { ok: false, fout: "De einddatum ligt voor de begindatum." };
  }

  const werkdagen = werkdagenTussen(van, tot);
  if (werkdagen <= 0) {
    return {
      ok: false,
      fout: "Er zitten geen werkdagen (ma–vr) in die periode.",
    };
  }
  const dagen = halveDag ? 0.5 : werkdagen;

  // Bij het opnemen van overuren: controleer het beschikbare saldo.
  if (type === "overuren") {
    const saldo = await overurenSaldo(ik);
    const nodigUren = dagen * Number(ik.standaard_uren_per_dag);
    if (nodigUren > saldo.beschikbaar + 0.001) {
      return {
        ok: false,
        fout: `Onvoldoende overuren: je vraagt ${toonUren(
          nodigUren
        )} aan, maar er is nog ${toonUren(saldo.beschikbaar)} beschikbaar.`,
      };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("verlofaanvragen").insert({
    werknemer_id: ik.id,
    type,
    van,
    tot,
    dagdeel,
    aantal_dagen: dagen,
    reden: reden || null,
    status: "aangevraagd",
  });

  if (error) {
    return { ok: false, fout: "Indienen mislukt: " + error.message };
  }

  revalidatePath("/verlof");
  revalidatePath("/beheer");
  return { ok: true, dagen };
}

// Een eigen aanvraag die nog in behandeling is, annuleren.
export async function verlofAnnuleren(formData: FormData) {
  const ik = await huidigeWerknemer();
  if (!ik) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  // RLS zorgt dat een werknemer enkel zijn eigen aanvraag kan wijzigen.
  await supabase
    .from("verlofaanvragen")
    .update({ status: "geannuleerd" })
    .eq("id", id)
    .eq("werknemer_id", ik.id)
    .eq("status", "aangevraagd");

  revalidatePath("/verlof");
  revalidatePath("/beheer");
}
