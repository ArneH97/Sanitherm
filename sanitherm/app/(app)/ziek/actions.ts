"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { huidigeWerknemer } from "@/lib/werknemer";
import type { ZiekResultaat } from "./types";

const TOEGELATEN_TYPES = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
  "application/pdf",
];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// Laad een attest-bestand op naar de private bucket. Geeft het pad terug,
// of een foutmelding.
async function ladAttestOp(
  attest: File,
  werknemerId: string
): Promise<{ pad?: string; fout?: string }> {
  if (!TOEGELATEN_TYPES.includes(attest.type)) {
    return { fout: "Enkel een foto (jpg/png) of een pdf is toegelaten." };
  }
  if (attest.size > MAX_BYTES) {
    return { fout: "Het bestand is te groot (max 10 MB)." };
  }
  const ext = attest.name.includes(".")
    ? attest.name.split(".").pop()!.toLowerCase()
    : "dat";
  const pad = `${werknemerId}/${Date.now()}.${ext}`;
  try {
    const admin = createAdminClient();
    const buffer = Buffer.from(await attest.arrayBuffer());
    const { error } = await admin.storage
      .from("attesten")
      .upload(pad, buffer, { contentType: attest.type, upsert: false });
    if (error) return { fout: "Attest opladen mislukt: " + error.message };
    return { pad };
  } catch (e) {
    const bericht = e instanceof Error ? e.message : "onbekende serverfout";
    return { fout: "Serverfout bij opladen: " + bericht };
  }
}

export async function ziekMelden(
  _vorige: ZiekResultaat | null,
  formData: FormData
): Promise<ZiekResultaat> {
  const ik = await huidigeWerknemer();
  if (!ik) return { ok: false, fout: "Niet ingelogd." };

  const van = String(formData.get("van") ?? "").trim();
  const totRuw = String(formData.get("tot") ?? "").trim();
  const tot = totRuw || null;

  const datumOk = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (!datumOk(van)) return { ok: false, fout: "Vul een begindatum in." };
  if (tot && !datumOk(tot)) {
    return { ok: false, fout: "Ongeldige einddatum." };
  }
  if (tot && tot < van) {
    return { ok: false, fout: "De einddatum ligt voor de begindatum." };
  }

  // Attest is optioneel — het mag later toegevoegd worden.
  let attestPad: string | null = null;
  const attest = formData.get("attest") as File | null;
  if (attest && attest.size > 0) {
    const res = await ladAttestOp(attest, ik.id);
    if (res.fout) return { ok: false, fout: res.fout };
    attestPad = res.pad ?? null;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("ziektemeldingen").insert({
    werknemer_id: ik.id,
    van,
    tot,
    attest_pad: attestPad,
  });
  if (error) {
    return { ok: false, fout: "Ziekmelding mislukt: " + error.message };
  }

  revalidatePath("/ziek");
  revalidatePath("/beheer");
  return { ok: true, heeftAttest: attestPad != null };
}

// Achteraf een attest toevoegen aan een bestaande ziekmelding.
export async function attestToevoegen(formData: FormData) {
  const ik = await huidigeWerknemer();
  if (!ik) return;

  const id = String(formData.get("id") ?? "");
  const attest = formData.get("attest") as File | null;
  if (!id || !attest || attest.size === 0) return;

  const res = await ladAttestOp(attest, ik.id);
  if (!res.pad) return;

  const supabase = await createClient();
  // RLS zorgt dat een werknemer enkel zijn eigen melding kan bijwerken.
  await supabase
    .from("ziektemeldingen")
    .update({ attest_pad: res.pad, attest_herinnerd: true })
    .eq("id", id)
    .eq("werknemer_id", ik.id);

  revalidatePath("/ziek");
  revalidatePath("/beheer");
}
