"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Bevestig de uren van een week. De arbeider verklaart dat de week klopt.
export async function bevestigWeek(formData: FormData) {
  const jaar = Number(formData.get("jaar"));
  const week = Number(formData.get("week"));
  const totaal = Number(formData.get("totaal"));
  const overuren = Number(formData.get("overuren"));
  const van = String(formData.get("van"));
  const tot = String(formData.get("tot"));
  if (!jaar || !week) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("weekbevestigingen").upsert(
    {
      werknemer_id: user.id,
      jaar,
      weeknummer: week,
      totaal_uren: totaal,
      overuren,
      bevestigd_op: new Date().toISOString(),
    },
    { onConflict: "werknemer_id,jaar,weeknummer" }
  );

  // Markeer de dagen van die week als 'bevestigd'.
  await supabase
    .from("tijdsregistraties")
    .update({ status: "bevestigd" })
    .eq("werknemer_id", user.id)
    .gte("datum", van)
    .lte("datum", tot)
    .eq("status", "open");

  revalidatePath("/week");
}
