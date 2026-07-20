import { createAdminClient } from "@/lib/supabase/admin";

// Maak een tijdelijke (30 min) downloadlink voor een attest in de private
// bucket 'attesten'. Gebruikt de service_role, dus enkel server-side aanroepen.
export async function attestSignedUrl(
  pad: string | null
): Promise<string | null> {
  if (!pad) return null;
  try {
    const admin = createAdminClient();
    const { data } = await admin.storage
      .from("attesten")
      .createSignedUrl(pad, 60 * 30);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

// Zelfde, maar voor meerdere paden in één enkele oproep (i.p.v. één per attest).
// Behoudt de volgorde en geeft null terug voor lege paden of mislukte links.
export async function attestSignedUrls(
  paden: (string | null)[]
): Promise<(string | null)[]> {
  const geldig = paden.filter((p): p is string => !!p);
  if (geldig.length === 0) return paden.map(() => null);

  try {
    const admin = createAdminClient();
    const { data } = await admin.storage
      .from("attesten")
      .createSignedUrls(geldig, 60 * 30);

    const perPad = new Map<string, string>();
    for (const rij of data ?? []) {
      if (rij.path && rij.signedUrl && !rij.error) {
        perPad.set(rij.path, rij.signedUrl);
      }
    }
    return paden.map((p) => (p ? perPad.get(p) ?? null : null));
  } catch {
    return paden.map(() => null);
  }
}
