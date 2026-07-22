import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let vapidGezet = false;
function zetVapid(): boolean {
  if (vapidGezet) return true;
  const pub =
    process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:arne@halcoservices.be",
    pub,
    priv
  );
  vapidGezet = true;
  return true;
}

export type PushInhoud = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

// Stuur een pushmelding naar alle toestellen van de opgegeven werknemers.
// Veilig aan te roepen: faalt stil (bv. als VAPID niet is ingesteld).
export async function stuurPush(
  werknemerIds: string[],
  inhoud: PushInhoud
): Promise<number> {
  if (werknemerIds.length === 0 || !zetVapid()) return 0;

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_abonnementen")
    .select("*")
    .in("werknemer_id", werknemerIds);

  const payload = JSON.stringify({
    title: inhoud.title,
    body: inhoud.body,
    url: inhoud.url ?? "/",
    tag: inhoud.tag,
  });

  let verstuurd = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        verstuurd++;
      } catch (e) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await admin
            .from("push_abonnementen")
            .delete()
            .eq("endpoint", s.endpoint);
        }
      }
    })
  );
  return verstuurd;
}

// De id's van de actieve zaakvoerder(s).
export async function zaakvoerderIds(): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("werknemers")
    .select("id")
    .eq("rol", "zaakvoerder")
    .eq("actief", true);
  return (data ?? []).map((w) => w.id as string);
}
