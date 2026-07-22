"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { huidigeWerknemer } from "@/lib/werknemer";

// De werknemer werkt zijn eigen contactgegevens bij. Enkel deze velden — niet
// zijn rol, uurrooster of tellers.
export async function contactkaartOpslaan(formData: FormData) {
  const ik = await huidigeWerknemer();
  if (!ik) return;

  const tekst = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v || null;
  };

  const supabase = await createClient();
  await supabase
    .from("werknemers")
    .update({
      voornaam: tekst("voornaam"),
      achternaam: tekst("achternaam"),
      adres: tekst("adres"),
      geboortedatum: tekst("geboortedatum"),
      gsm: tekst("gsm"),
      noodcontact_naam: tekst("noodcontact_naam"),
      noodcontact_gsm: tekst("noodcontact_gsm"),
    })
    .eq("id", ik.id);

  revalidatePath("/kaart");
}
