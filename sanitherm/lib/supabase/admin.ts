import { createClient } from "@supabase/supabase-js";

// Supabase-client met service_role-rechten.
// LET OP: enkel server-side gebruiken (server actions / route handlers).
// Deze client omzeilt Row Level Security en kan auth-accounts aanmaken,
// dus de aanroepende code moet zelf controleren dat de gebruiker zaakvoerder is.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY of NEXT_PUBLIC_SUPABASE_URL ontbreekt in de omgeving."
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
