import { type NextRequest } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { vandaagInBrussel, isoWeek } from "@/lib/uren";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Wekelijkse herinnering: stuur zondag om 18u (Brussel) een pushmelding naar
// elke actieve werknemer die zijn week nog niet bevestigd heeft.
export async function GET(request: NextRequest) {
  // 1. Toegang: Vercel Cron stuurt "Authorization: Bearer <CRON_SECRET>".
  //    Voor handmatig testen mag ook ?key=<CRON_SECRET>.
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const keyParam = request.nextUrl.searchParams.get("key");
  const ok = !secret || auth === `Bearer ${secret}` || keyParam === secret;
  if (!ok) return new Response("Unauthorized", { status: 401 });

  const force = request.nextUrl.searchParams.get("force") === "1";

  // 2. Tijdvenster: enkel zondag 18u in Brussel (DST-veilig), tenzij ?force=1.
  const delen = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Brussels",
    weekday: "long",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const weekdag = delen.find((d) => d.type === "weekday")?.value;
  const uur = Number(delen.find((d) => d.type === "hour")?.value);
  if (!force && (weekdag !== "Sunday" || uur !== 18)) {
    return Response.json({ overgeslagen: true, weekdag, uur });
  }

  // 3. VAPID-sleutels.
  const vapidPublic =
    process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) {
    return new Response("VAPID-sleutels ontbreken", { status: 500 });
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:arne@halcoservices.be",
    vapidPublic,
    vapidPrivate
  );

  const admin = createAdminClient();

  // 4. Om welke week gaat het? De ISO-week van vandaag (eindigt deze zondag).
  const datum = vandaagInBrussel();
  const { jaar, week } = isoWeek(new Date(datum + "T12:00:00Z"));

  // 5. Actieve arbeiders en wie al bevestigd heeft.
  const [wnsRes, bevRes] = await Promise.all([
    admin
      .from("werknemers")
      .select("id")
      .eq("rol", "arbeider")
      .eq("actief", true),
    admin
      .from("weekbevestigingen")
      .select("werknemer_id")
      .eq("jaar", jaar)
      .eq("weeknummer", week)
      .not("bevestigd_op", "is", null),
  ]);

  const alle = (wnsRes.data ?? []).map((w) => w.id as string);
  const bevestigd = new Set(
    (bevRes.data ?? []).map((b) => b.werknemer_id as string)
  );
  const teHerinneren = alle.filter((id) => !bevestigd.has(id));
  if (teHerinneren.length === 0) {
    return Response.json({ verstuurd: 0, reden: "iedereen heeft bevestigd" });
  }

  // 6. Push-abonnementen van die werknemers ophalen en versturen.
  const { data: subs } = await admin
    .from("push_abonnementen")
    .select("*")
    .in("werknemer_id", teHerinneren);

  const payload = JSON.stringify({
    title: "Sanitherm",
    body: "Vergeet je week niet te bevestigen 👍",
    url: "/week",
    tag: "week-herinnering",
  });

  let verstuurd = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      );
      verstuurd++;
    } catch (e) {
      const code = (e as { statusCode?: number })?.statusCode;
      // Verlopen/ongeldig abonnement opruimen.
      if (code === 404 || code === 410) {
        await admin.from("push_abonnementen").delete().eq("endpoint", s.endpoint);
      }
    }
  }

  return Response.json({
    verstuurd,
    teHerinneren: teHerinneren.length,
    jaar,
    week,
  });
}
