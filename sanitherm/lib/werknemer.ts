import { createClient } from "@/lib/supabase/server";
import type { Werknemer } from "@/lib/types";

// Haal het profiel van de ingelogde gebruiker op (of null als niet ingelogd).
export async function huidigeWerknemer(): Promise<Werknemer | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("werknemers")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as Werknemer) ?? null;
}
