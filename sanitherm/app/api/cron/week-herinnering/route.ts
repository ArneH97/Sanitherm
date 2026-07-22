import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stuurPush } from "@/lib/push";
import { vandaagInBrussel, isoWeek } from "@/lib/uren";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Geplande taak (Vercel Cron). Draait dagelijks (16u en 17u UTC):
//  - elke keer: herinnering aan wie na 12u nog geen ziekteattest indiende;
//  - enkel zondag 18u (Brussel): herinnering om de week te bevestigen.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const keyParam = request.nextUrl.searchParams.get("key");
  if (secret && auth !== `Bearer ${secret}` && keyParam !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }
  const force = request.nextUrl.searchParams.get("force") === "1";

  const attestVerstuurd = await attestHerinneringen();

  const delen = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Brussels",
    weekday: "long",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const weekdag = delen.find((d) => d.type === "weekday")?.value;
  const uur = Number(delen.find((d) => d.type === "hour")?.value);

  let weekVerstuurd = 0;
  if (force || (weekdag === "Sunday" && uur === 18)) {
    weekVerstuurd = await weekHerinneringen();
  }

  return Response.json({ attestVerstuurd, weekVerstuurd, weekdag, uur });
}

// Werknemers die hun week nog niet bevestigd hebben, herinneren.
async function weekHerinneringen(): Promise<number> {
  const admin = createAdminClient();
  const datum = vandaagInBrussel();
  const { jaar, week } = isoWeek(new Date(datum + "T12:00:00Z"));

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
  if (teHerinneren.length === 0) return 0;

  return stuurPush(teHerinneren, {
    title: "Sanitherm",
    body: "Vergeet je week niet te bevestigen 👍",
    url: "/week",
    tag: "week-herinnering",
  });
}

// Ziekmeldingen zonder attest, ouder dan 12 uur, nog niet herinnerd.
async function attestHerinneringen(): Promise<number> {
  const admin = createAdminClient();
  const grens = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

  const { data } = await admin
    .from("ziektemeldingen")
    .select("id, werknemer_id")
    .is("attest_pad", null)
    .eq("attest_herinnerd", false)
    .lt("gemeld_op", grens);

  const meldingen = data ?? [];
  let verstuurd = 0;
  for (const m of meldingen) {
    verstuurd += await stuurPush([m.werknemer_id as string], {
      title: "Sanitherm",
      body: "Vergeet je ziekteattest niet — dien het binnen de 24 uur in.",
      url: "/ziek",
      tag: "attest-herinnering",
    });
    await admin
      .from("ziektemeldingen")
      .update({ attest_herinnerd: true })
      .eq("id", m.id);
  }
  return verstuurd;
}
