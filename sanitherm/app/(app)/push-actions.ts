"use server";

import { createClient } from "@/lib/supabase/server";

// Bewaar (of vernieuw) het push-abonnement van het huidige toestel.
export async function pushInschrijven(abonnement: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase.from("push_abonnementen").upsert(
    {
      werknemer_id: user.id,
      endpoint: abonnement.endpoint,
      p256dh: abonnement.p256dh,
      auth: abonnement.auth,
    },
    { onConflict: "endpoint" }
  );

  return { ok: !error };
}

// Verwijder het push-abonnement van dit toestel.
export async function pushUitschrijven(endpoint: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("push_abonnementen")
    .delete()
    .eq("endpoint", endpoint)
    .eq("werknemer_id", user.id);
}
