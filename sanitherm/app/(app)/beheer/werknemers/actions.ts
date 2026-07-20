"use server";

import { revalidatePath } from "next/cache";
import { huidigeWerknemer } from "@/lib/werknemer";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROOSTER_DAGEN } from "@/lib/types";
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

function getalOfNull(ruw: string): number | null {
  const s = ruw.trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

// Lees het weekschema uit het formulier en leid de weekstandaard + de
// gemiddelde uren per (verlof)dag af.
function leesRooster(formData: FormData) {
  const uren: Record<string, number> = {};
  let som = 0;
  let werkdagen = 0;
  for (const d of ROOSTER_DAGEN) {
    const v = getalOfNull(String(formData.get(`rooster_${d.key}`) ?? "")) ?? 0;
    const veilig = Math.max(0, v);
    uren[`rooster_${d.key}`] = veilig;
    som += veilig;
    if (veilig > 0) werkdagen++;
  }
  const perWeek = Math.round(som * 100) / 100;
  const perDag =
    werkdagen > 0 ? Math.round((som / werkdagen) * 100) / 100 : 8;
  return { uren, perWeek, perDag };
}

// Zaakvoerder maakt een nieuwe arbeider aan.
// De databank-trigger (handle_new_user) maakt automatisch het werknemer-profiel
// aan op basis van de meegegeven metadata (naam + rol).
export async function arbeiderToevoegen(
  _vorige: ToevoegenResultaat | null,
  formData: FormData
): Promise<ToevoegenResultaat> {
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

    const uid = data.user.id;

    // Profiel aanvullen: startdatum, prijs per overuur en het weekschema.
    const { uren, perWeek, perDag } = leesRooster(formData);
    await admin
      .from("werknemers")
      .update({
        startdatum: startdatum || null,
        overuur_prijs: getalOfNull(String(formData.get("overuur_prijs") ?? "")),
        ...uren,
        standaard_uren_per_week: perWeek,
        standaard_uren_per_dag: perDag,
      })
      .eq("id", uid);

    // Verlofteller voor dit jaar: totaal + hoeveel er nu nog over is.
    const jaar = new Date().getFullYear();
    const wvTotaal = getalOfNull(String(formData.get("wv_totaal") ?? "")) ?? 20;
    const wvOver = getalOfNull(String(formData.get("wv_over") ?? "")) ?? wvTotaal;
    const advTotaal =
      getalOfNull(String(formData.get("adv_totaal") ?? "")) ?? 12;
    const advOver =
      getalOfNull(String(formData.get("adv_over") ?? "")) ?? advTotaal;

    await admin.from("verloftellers").upsert(
      {
        werknemer_id: uid,
        jaar,
        wettelijk_verlof_totaal: wvTotaal,
        wettelijk_verlof_opgenomen: Math.max(0, wvTotaal - wvOver),
        adv_totaal: advTotaal,
        adv_opgenomen: Math.max(0, advTotaal - advOver),
      },
      { onConflict: "werknemer_id,jaar" }
    );
  } catch (e) {
    const bericht = e instanceof Error ? e.message : "onbekende serverfout";
    return { ok: false, fout: "Serverfout: " + bericht };
  }

  revalidatePath("/beheer/werknemers");
  revalidatePath("/beheer");

  return { ok: true, naam, email, wachtwoord };
}

// Zaakvoerder stelt een nieuw tijdelijk wachtwoord in voor een arbeider.
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
// startdatum (ancienniteit), prijs per overuur en het weekschema.
export async function profielOpslaan(formData: FormData) {
  const ik = await huidigeWerknemer();
  if (!ik || ik.rol !== "zaakvoerder") return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const startdatum = String(formData.get("startdatum") ?? "").trim();
  const { uren, perWeek, perDag } = leesRooster(formData);

  try {
    const admin = createAdminClient();
    await admin
      .from("werknemers")
      .update({
        startdatum: startdatum || null,
        overuur_prijs: getalOfNull(String(formData.get("overuur_prijs") ?? "")),
        ...uren,
        standaard_uren_per_week: perWeek,
        standaard_uren_per_dag: perDag,
      })
      .eq("id", id);
  } catch {
    return;
  }

  revalidatePath(`/beheer/werknemers/${id}`);
  revalidatePath("/beheer/werknemers");
  revalidatePath("/beheer");
}

// Zaakvoerder stelt de verloftellers in: totaal per jaar + hoeveel er nu nog
// over is. Het opgenomen aantal wordt daaruit afgeleid.
export async function verlofTellerOpslaan(formData: FormData) {
  const ik = await huidigeWerknemer();
  if (!ik || ik.rol !== "zaakvoerder") return;

  const id = String(formData.get("id") ?? "");
  const jaar = Number(formData.get("jaar"));
  if (!id || !jaar) return;

  const wvTotaal = getalOfNull(String(formData.get("wv_totaal") ?? "")) ?? 20;
  const wvOver = getalOfNull(String(formData.get("wv_over") ?? "")) ?? wvTotaal;
  const advTotaal = getalOfNull(String(formData.get("adv_totaal") ?? "")) ?? 12;
  const advOver = getalOfNull(String(formData.get("adv_over") ?? "")) ?? advTotaal;

  try {
    const admin = createAdminClient();
    await admin.from("verloftellers").upsert(
      {
        werknemer_id: id,
        jaar,
        wettelijk_verlof_totaal: wvTotaal,
        wettelijk_verlof_opgenomen: Math.max(0, wvTotaal - wvOver),
        adv_totaal: advTotaal,
        adv_opgenomen: Math.max(0, advTotaal - advOver),
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
    return;
  }

  revalidatePath("/beheer/werknemers");
  revalidatePath("/beheer");
}
