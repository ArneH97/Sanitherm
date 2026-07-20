"use server";

import { revalidatePath } from "next/cache";
import { huidigeWerknemer } from "@/lib/werknemer";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ToevoegenResultaat, ResetResultaat } from "./types";

// Genereer een leesbaar tijdelijk wachtwoord (geen dubbelzinnige tekens zoals 0/O, 1/l).
function genereerWachtwoord(lengte = 10): string {
  const alfabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(lengte);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < lengte; i++) out += alfabet[bytes[i] % alfabet.length];
  return out;
}

// Zaakvoerder maakt een nieuwe arbeider aan.
// De databank-trigger (handle_new_user) maakt automatisch het werknemer-profiel
// aan op basis van de meegegeven metadata (naam + rol).
export async function arbeiderToevoegen(
  _vorige: ToevoegenResultaat | null,
  formData: FormData
): Promise<ToevoegenResultaat> {
  // Alleen de zaakvoerder mag arbeiders aanmaken.
  const ik = await huidigeWerknemer();
  if (!ik || ik.rol !== "zaakvoerder") {
    return { ok: false, fout: "Geen toestemming." };
  }

  const naam = String(formData.get("naam") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const startdatum = String(formData.get("startdatum") ?? "").trim();
  let wachtwoord = String(formData.get("wachtwoord") ?? "").trim();

  if (!naam) return { ok: false, fout: "Vul een naam in." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, fout: "Vul een geldig e-mailadres in." };
  }
  if (!wachtwoord) wachtwoord = genereerWachtwoord();
  if (wachtwoord.length < 6) {
    return { ok: false, fout: "Het wachtwoord moet minstens 6 tekens zijn." };
  }

  try {
    const admin = createAdminClient();

    // 1. Auth-account aanmaken. email_confirm = true zodat de arbeider meteen
    //    kan aanmelden zonder bevestigingsmail.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: wachtwoord,
      email_confirm: true,
      user_metadata: { naam, rol: "arbeider" },
    });

    if (error || !data?.user) {
      const melding = (error?.message ?? "").toLowerCase();
      if (melding.includes("already") || melding.includes("registered")) {
        return {
          ok: false,
          fout: "Er bestaat al een account met dat e-mailadres.",
        };
      }
      return {
        ok: false,
        fout: "Aanmaken mislukt: " + (error?.message || "onbekende fout"),
      };
    }

    // 2. Optionele startdatum bijwerken (de trigger heeft de rij al aangemaakt).
    if (startdatum) {
      await admin
        .from("werknemers")
        .update({ startdatum })
        .eq("id", data.user.id);
    }
  } catch (e) {
    // Bv. wanneer de service_role-sleutel niet is ingesteld op de server.
    const bericht = e instanceof Error ? e.message : "onbekende serverfout";
    return { ok: false, fout: "Serverfout: " + bericht };
  }

  revalidatePath("/beheer/werknemers");
  revalidatePath("/beheer");

  return { ok: true, naam, email, wachtwoord };
}

// Zaakvoerder stelt een nieuw tijdelijk wachtwoord in voor een arbeider.
// Nodig wanneer het wachtwoord verloren is (het oorspronkelijke wordt maar
// één keer getoond en kan nadien niet meer worden opgevraagd).
export async function wachtwoordOpnieuw(
  _vorige: ResetResultaat | null,
  formData: FormData
): Promise<ResetResultaat> {
  const ik = await huidigeWerknemer();
  if (!ik || ik.rol !== "zaakvoerder") {
    return { ok: false, fout: "Geen toestemming." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, fout: "Onbekende werknemer." };

  const wachtwoord = genereerWachtwoord();

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(id, {
      password: wachtwoord,
    });
    if (error) {
      return { ok: false, fout: "Mislukt: " + error.message };
    }
  } catch (e) {
    const bericht = e instanceof Error ? e.message : "onbekende serverfout";
    return { ok: false, fout: "Serverfout: " + bericht };
  }

  return { ok: true, wachtwoord };
}

// Zaakvoerder past het profiel van een arbeider aan:
// startdatum (voor ancienniteit), uurloon en het standaardrooster.
export async function profielOpslaan(formData: FormData) {
  const ik = await huidigeWerknemer();
  if (!ik || ik.rol !== "zaakvoerder") return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const startdatum = String(formData.get("startdatum") ?? "").trim();
  const uurloonRuw = String(formData.get("uurloon") ?? "").trim();
  const urenDagRuw = String(formData.get("uren_dag") ?? "").trim();
  const urenWeekRuw = String(formData.get("uren_week") ?? "").trim();

  const getal = (ruw: string): number | null => {
    if (!ruw) return null;
    const n = Number(ruw.replace(",", "."));
    return Number.isNaN(n) ? null : n;
  };

  const update: {
    startdatum: string | null;
    uurloon: number | null;
    standaard_uren_per_dag?: number;
    standaard_uren_per_week?: number;
  } = {
    startdatum: startdatum || null,
    uurloon: getal(uurloonRuw),
  };
  const ud = getal(urenDagRuw);
  const uw = getal(urenWeekRuw);
  if (ud != null) update.standaard_uren_per_dag = ud;
  if (uw != null) update.standaard_uren_per_week = uw;

  try {
    const admin = createAdminClient();
    await admin.from("werknemers").update(update).eq("id", id);
  } catch {
    return;
  }

  revalidatePath(`/beheer/werknemers/${id}`);
  revalidatePath("/beheer/werknemers");
  revalidatePath("/beheer");
}

// Zaakvoerder stelt het beginsaldo van de verloftellers in voor een jaar.
export async function verlofTellerOpslaan(formData: FormData) {
  const ik = await huidigeWerknemer();
  if (!ik || ik.rol !== "zaakvoerder") return;

  const id = String(formData.get("id") ?? "");
  const jaar = Number(formData.get("jaar"));
  if (!id || !jaar) return;

  const getal = (k: string, standaard: number): number => {
    const n = Number(String(formData.get(k) ?? "").replace(",", "."));
    return Number.isNaN(n) ? standaard : n;
  };

  try {
    const admin = createAdminClient();
    await admin.from("verloftellers").upsert(
      {
        werknemer_id: id,
        jaar,
        wettelijk_verlof_totaal: getal("wv_totaal", 20),
        wettelijk_verlof_opgenomen: getal("wv_opgenomen", 0),
        adv_totaal: getal("adv_totaal", 12),
        adv_opgenomen: getal("adv_opgenomen", 0),
      },
      { onConflict: "werknemer_id,jaar" }
    );
  } catch {
    return;
  }

  revalidatePath(`/beheer/werknemers/${id}`);
}

// Arbeider (de)activeren. Een inactieve arbeider blijft in de historiek staan
// maar verdwijnt uit het dagelijkse overzicht.
export async function arbeiderActiefWisselen(formData: FormData) {
  const ik = await huidigeWerknemer();
  if (!ik || ik.rol !== "zaakvoerder") return;

  const id = String(formData.get("id") ?? "");
  const naarActief = String(formData.get("actief") ?? "") === "true";
  if (!id) return;

  try {
    const admin = createAdminClient();
    await admin.from("werknemers").update({ actief: naarActief }).eq("id", id);
  } catch {
    // stil falen: knop doet niets als de server niet correct is ingesteld
    return;
  }

  revalidatePath("/beheer/werknemers");
  revalidatePath("/beheer");
}
