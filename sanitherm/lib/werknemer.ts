import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Werknemer } from "@/lib/types";

// Haal het profiel van de ingelogde gebruiker op (of null als niet ingelogd).
// `cache()` zorgt dat deze functie binnen één aanvraag maar één keer echt
// uitgevoerd wordt, ook al roepen de layout, de sub-layout en de pagina ze
// allemaal aan. Dat scheelt overbodige auth-controles en databankqueries.
export const huidigeWerknemer = cache(
  async (): Promise<Werknemer | null> => {
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
);
