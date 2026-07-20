"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  berekenGewerkteUren,
  vandaagInBrussel,
  wandtijdNaarInstant,
} from "@/lib/uren";
import type { Tijdsregistratie, DagSoort } from "@/lib/types";

const SOORTEN: readonly DagSoort[] = ["gewoon", "weekend", "bouwverlof"];
function leesSoort(formData: FormData): DagSoort {
  const s = String(formData.get("soort") ?? "gewoon");
  return SOORTEN.includes(s as DagSoort) ? (s as DagSoort) : "gewoon";
}

// Haal (of maak) de registratie van vandaag voor de ingelogde arbeider.
async function registratieVanVandaag() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");

  const datum = vandaagInBrussel();

  const { data: bestaand } = await supabase
    .from("tijdsregistraties")
    .select("*")
    .eq("werknemer_id", user.id)
    .eq("datum", datum)
    .maybeSingle();

  return { supabase, userId: user.id, datum, bestaand: bestaand as Tijdsregistratie | null };
}

export async function inchecken(formData: FormData) {
  const soort = leesSoort(formData);
  const { supabase, userId, datum, bestaand } = await registratieVanVandaag();
  const nu = new Date().toISOString();

  if (bestaand) {
    if (bestaand.checkin) return; // al ingecheckt
    await supabase
      .from("tijdsregistraties")
      .update({ checkin: nu, soort })
      .eq("id", bestaand.id);
  } else {
    // pauze uit de instellingen halen (fallback 30)
    const { data: inst } = await supabase
      .from("instellingen")
      .select("standaard_pauze_minuten")
      .eq("id", 1)
      .maybeSingle();
    await supabase.from("tijdsregistraties").insert({
      werknemer_id: userId,
      datum,
      checkin: nu,
      pauze_minuten: inst?.standaard_pauze_minuten ?? 30,
      status: "open",
      soort,
    });
  }
  revalidatePath("/vandaag");
  revalidatePath("/week");
}

// Soort dag aanpassen (bv. verkeerd gekozen bij het inchecken).
export async function zetSoort(formData: FormData) {
  const soort = leesSoort(formData);
  const { supabase, bestaand } = await registratieVanVandaag();
  if (!bestaand) return;
  await supabase
    .from("tijdsregistraties")
    .update({ soort })
    .eq("id", bestaand.id);
  revalidatePath("/vandaag");
  revalidatePath("/week");
}

export async function uitchecken() {
  const { supabase, bestaand } = await registratieVanVandaag();
  if (!bestaand || !bestaand.checkin || bestaand.checkout) return;
  const nu = new Date().toISOString();
  const uren = berekenGewerkteUren(
    bestaand.checkin,
    nu,
    bestaand.pauze_minuten
  );
  await supabase
    .from("tijdsregistraties")
    .update({ checkout: nu, gewerkte_uren: uren })
    .eq("id", bestaand.id);
  revalidatePath("/vandaag");
  revalidatePath("/week");
}

// Corrigeer een tijd (bv. te laat ingecheckt). Wordt gelogd in de audit-tabel.
export async function corrigeer(formData: FormData) {
  const veld = String(formData.get("veld")) as "checkin" | "checkout";
  const tijd = String(formData.get("tijd")); // 'HH:MM'
  if (veld !== "checkin" && veld !== "checkout") return;
  if (!/^\d{2}:\d{2}$/.test(tijd)) return;

  const { supabase, userId, datum, bestaand } = await registratieVanVandaag();
  if (!bestaand) return;

  const nieuweInstant = wandtijdNaarInstant(datum, tijd);
  const oudeWaarde = bestaand[veld];

  // Herbereken de uren als beide tijden bekend zijn.
  const checkin = veld === "checkin" ? nieuweInstant : bestaand.checkin;
  const checkout = veld === "checkout" ? nieuweInstant : bestaand.checkout;
  const uren = berekenGewerkteUren(checkin, checkout, bestaand.pauze_minuten);

  await supabase
    .from("tijdsregistraties")
    .update({
      [veld]: nieuweInstant,
      gewerkte_uren: uren,
      handmatig_aangepast: true,
    })
    .eq("id", bestaand.id);

  // Log de wijziging (audit-trail).
  await supabase.from("registratie_wijzigingen").insert({
    registratie_id: bestaand.id,
    veld,
    oude_waarde: oudeWaarde ?? null,
    nieuwe_waarde: nieuweInstant,
    gewijzigd_door: userId,
  });

  revalidatePath("/vandaag");
  revalidatePath("/week");
}
