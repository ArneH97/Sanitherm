"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { InstellenResultaat } from "./types";

export async function wachtwoordInstellen(
  _vorige: InstellenResultaat | null,
  formData: FormData
): Promise<InstellenResultaat> {
  const nieuw = String(formData.get("wachtwoord") ?? "");
  const herhaal = String(formData.get("herhaal") ?? "");

  if (nieuw.length < 8) {
    return { fout: "Kies een wachtwoord van minstens 8 tekens." };
  }
  if (nieuw !== herhaal) {
    return { fout: "De twee wachtwoorden komen niet overeen." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { fout: "Je bent niet (meer) aangemeld. Meld je opnieuw aan." };
  }

  const { error } = await supabase.auth.updateUser({ password: nieuw });
  if (error) {
    return { fout: "Instellen mislukt: " + error.message };
  }

  await supabase
    .from("werknemers")
    .update({ wachtwoord_ingesteld: true })
    .eq("id", user.id);

  // Klaar — naar de startpagina (redirect() gooit, dus geen return nodig).
  redirect("/");
}
