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

  // Optioneel attest opladen naar de private bucket 'attesten'.
  let attestPad: string | null = null;
  const attest = formData.get("attest") as File | null;
  if (attest && attest.size > 0) {
    if (!TOEGELATEN_TYPES.includes(attest.type)) {
      return {
        ok: false,
        fout: "Enkel een foto (jpg/png) of een pdf is toegelaten.",
      };
    }
    if (attest.size > MAX_BYTES) {
      return { ok: false, fout: "Het bestand is te groot (max 10 MB)." };
    }
    const ext = attest.name.includes(".")
      ? attest.name.split(".").pop()!.toLowerCase()
      : "dat";
    const pad = `${ik.id}/${Date.now()}.${ext}`;
    try {
      const admin = createAdminClient();
      const buffer = Buffer.from(await attest.arrayBuffer());
      const { error } = await admin.storage
        .from("attesten")
        .upload(pad, buffer, { contentType: attest.type, upsert: false });
      if (error) {
        return { ok: false, fout: "Attest opladen mislukt: " + error.message };
      }
      attestPad = pad;
    } catch (e) {
      const bericht = e instanceof Error ? e.message : "onbekende serverfout";
      return { ok: false, fout: "Serverfout bij opladen: " + bericht };
    }
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
  return { ok: true };
}
