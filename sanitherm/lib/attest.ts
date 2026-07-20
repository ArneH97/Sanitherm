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
