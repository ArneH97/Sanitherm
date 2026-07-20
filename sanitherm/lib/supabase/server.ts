import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase-client voor server components en server actions.
// Gebruikt de cookies van de request voor de ingelogde sessie.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll wordt aangeroepen vanuit een Server Component:
            // dit kan genegeerd worden als de middleware de sessie ververst.
          }
        },
      },
    }
  );
}
