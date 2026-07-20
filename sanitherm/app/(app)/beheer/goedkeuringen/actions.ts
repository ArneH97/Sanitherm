"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { huidigeWerknemer } from "@/lib/werknemer";
import { isoWeekNaarDatums } from "@/lib/uren";
import type { Verlofaanvraag, Verloftellers } from "@/lib/types";

// Verlofaanvraag goedkeuren of weigeren.
export async function verlofBeslissen(formData: FormData) {
  const ik = await huidigeWerknemer();
  if (!ik || ik.rol !== "zaakvoerder") return;

  const id = String(formData.get("id") ?? "");
  const beslissing = String(formData.get("beslissing") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data } = await supabase
    .from("verlofaanvragen")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const aanvraag = data as Verlofaanvraag | null;
  if (!aanvraag || aanvraag.status !== "aangevraagd") return;

  const nu = new Date().toISOString();

  if (beslissing === "goedkeuren") {
    await supabase
      .from("verlofaanvragen")
      .update({ status: "goedgekeurd", beoordeeld_door: ik.id, beoordeeld_op: nu })
      .eq("id", id);

    // Wettelijk verlof en ADV verlagen de teller. Overuren-opname wordt al
    // automatisch verrekend in het overuren-saldo; onbetaald/klein verlet niet.
    if (
      aanvraag.type === "wettelijk_verlof" ||
      aanvraag.type === "adv_inhaalrust"
    ) {
      const jaar = Number(String(aanvraag.van).slice(0, 4));
      const dagen = Number(aanvraag.aantal_dagen);
      const admin = createAdminClient();

      const { data: tData } = await admin
        .from("verloftellers")
        .select("*")
        .eq("werknemer_id", aanvraag.werknemer_id)
        .eq("jaar", jaar)
        .maybeSingle();
      const teller = tData as Verloftellers | null;

      const nieuw = {
        werknemer_id: aanvraag.werknemer_id,
        jaar,
        wettelijk_verlof_totaal: teller?.wettelijk_verlof_totaal ?? 20,
        wettelijk_verlof_opgenomen: teller?.wettelijk_verlof_opgenomen ?? 0,
        adv_totaal: teller?.adv_totaal ?? 12,
        adv_opgenomen: teller?.adv_opgenomen ?? 0,
      };
      if (aanvraag.type === "wettelijk_verlof") {
        nieuw.wettelijk_verlof_opgenomen += dagen;
      } else {
        nieuw.adv_opgenomen += dagen;
      }

      await admin
        .from("verloftellers")
        .upsert(nieuw, { onConflict: "werknemer_id,jaar" });
    }
  } else if (beslissing === "weigeren") {
    const reden = String(formData.get("reden") ?? "").trim();
    await supabase
      .from("verlofaanvragen")
      .update({
        status: "geweigerd",
        beoordeeld_door: ik.id,
        beoordeeld_op: nu,
        reden_weigering: reden || null,
      })
      .eq("id", id);
  }

  revalidatePath("/beheer/goedkeuringen");
  revalidatePath("/beheer");
  revalidatePath("/verlof");
}

// Weekbevestiging goedkeuren of terugsturen (heropenen).
export async function weekBeslissen(formData: FormData) {
  const ik = await huidigeWerknemer();
  if (!ik || ik.rol !== "zaakvoerder") return;

  const id = String(formData.get("id") ?? "");
  const beslissing = String(formData.get("beslissing") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data } = await supabase
    .from("weekbevestigingen")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return;

  const { van, tot } = isoWeekNaarDatums(
    Number(data.jaar),
    Number(data.weeknummer)
  );
  const nu = new Date().toISOString();

  if (beslissing === "goedkeuren") {
    await supabase
      .from("weekbevestigingen")
      .update({ goedgekeurd_door: ik.id, goedgekeurd_op: nu })
      .eq("id", id);
    await supabase
      .from("tijdsregistraties")
      .update({ status: "goedgekeurd" })
      .eq("werknemer_id", data.werknemer_id)
      .gte("datum", van)
      .lte("datum", tot)
      .eq("status", "bevestigd");
  } else if (beslissing === "terugsturen") {
    // Heropenen zodat de werknemer kan corrigeren en opnieuw bevestigen.
    await supabase
      .from("weekbevestigingen")
      .update({ bevestigd_op: null, goedgekeurd_door: null, goedgekeurd_op: null })
      .eq("id", id);
    await supabase
      .from("tijdsregistraties")
      .update({ status: "open" })
      .eq("werknemer_id", data.werknemer_id)
      .gte("datum", van)
      .lte("datum", tot)
      .eq("status", "bevestigd");
  }

  revalidatePath("/beheer/goedkeuringen");
  revalidatePath("/beheer");
  revalidatePath("/week");
}
