import { type NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { huidigeWerknemer } from "@/lib/werknemer";
import { toonDatum, toonTijd } from "@/lib/uren";
import type { Tijdsregistratie, Werknemer } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Compacte uren-weergave voor de pdf-tabel, bv. "8u30".
function kortUren(uren: number | null): string {
  if (uren == null) return "—";
  const totaalMin = Math.round(Math.abs(uren) * 60);
  const u = Math.floor(totaalMin / 60);
  const m = totaalMin % 60;
  return `${u}u${String(m).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  const ik = await huidigeWerknemer();
  if (!ik || ik.rol !== "zaakvoerder") {
    return new Response("Geen toegang", { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const werknemerId = params.get("werknemer") ?? "";
  const van = params.get("van") ?? "";
  const tot = params.get("tot") ?? "";
  const datumOk = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (!werknemerId || !datumOk(van) || !datumOk(tot) || tot < van) {
    return new Response("Ongeldige parameters", { status: 400 });
  }

  const supabase = await createClient();

  const { data: wData } = await supabase
    .from("werknemers")
    .select("*")
    .eq("id", werknemerId)
    .maybeSingle();
  const werknemer = wData as Werknemer | null;
  if (!werknemer) {
    return new Response("Werknemer niet gevonden", { status: 404 });
  }

  const { data: rData } = await supabase
    .from("tijdsregistraties")
    .select("*")
    .eq("werknemer_id", werknemerId)
    .gte("datum", van)
    .lte("datum", tot)
    .order("datum", { ascending: true });
  const regs = (rData as Tijdsregistratie[]) ?? [];

  const totaalUren = regs.reduce((s, r) => s + (r.gewerkte_uren ?? 0), 0);
  const totaalDagen = regs.filter((r) => (r.gewerkte_uren ?? 0) > 0).length;

  // ---- PDF opbouwen ----
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const grijs = rgb(0.35, 0.35, 0.35);
  const zwart = rgb(0.1, 0.1, 0.1);
  const merk = rgb(0.06, 0.35, 0.66);

  const breedte = 595;
  const hoogte = 842;
  const marge = 40;

  const kolom = { datum: 40, in: 210, uit: 275, pauze: 340, uren: 470 };

  let page = pdf.addPage([breedte, hoogte]);
  let y = hoogte - marge;

  const tekst = (
    s: string,
    x: number,
    yy: number,
    opties: { f?: typeof font; size?: number; kleur?: typeof zwart } = {}
  ) => {
    page.drawText(s, {
      x,
      y: yy,
      size: opties.size ?? 10,
      font: opties.f ?? font,
      color: opties.kleur ?? zwart,
    });
  };

  // Titel
  tekst("Tijdsregistratie", marge, y, { f: bold, size: 18, kleur: merk });
  y -= 26;
  tekst(`Werknemer: ${werknemer.naam}`, marge, y, { size: 11 });
  y -= 16;
  tekst(`Periode: ${toonDatum(van)} t.e.m. ${toonDatum(tot)}`, marge, y, {
    size: 11,
    kleur: grijs,
  });
  y -= 28;

  const kopregel = (yy: number) => {
    tekst("Datum", kolom.datum, yy, { f: bold, size: 9, kleur: grijs });
    tekst("In", kolom.in, yy, { f: bold, size: 9, kleur: grijs });
    tekst("Uit", kolom.uit, yy, { f: bold, size: 9, kleur: grijs });
    tekst("Pauze", kolom.pauze, yy, { f: bold, size: 9, kleur: grijs });
    tekst("Gewerkt", kolom.uren, yy, { f: bold, size: 9, kleur: grijs });
  };

  kopregel(y);
  y -= 6;
  page.drawLine({
    start: { x: marge, y },
    end: { x: breedte - marge, y },
    thickness: 0.7,
    color: grijs,
  });
  y -= 16;

  if (regs.length === 0) {
    tekst("Geen tijdsregistraties in deze periode.", marge, y, {
      kleur: grijs,
    });
    y -= 20;
  }

  for (const r of regs) {
    if (y < 70) {
      page = pdf.addPage([breedte, hoogte]);
      y = hoogte - marge;
      kopregel(y);
      y -= 6;
      page.drawLine({
        start: { x: marge, y },
        end: { x: breedte - marge, y },
        thickness: 0.7,
        color: grijs,
      });
      y -= 16;
    }
    tekst(toonDatum(r.datum), kolom.datum, y);
    tekst(toonTijd(r.checkin), kolom.in, y);
    tekst(toonTijd(r.checkout), kolom.uit, y);
    tekst(`${r.pauze_minuten} min`, kolom.pauze, y);
    tekst(kortUren(r.gewerkte_uren), kolom.uren, y, { f: bold });
    y -= 18;
  }

  // Totaallijn
  y -= 4;
  page.drawLine({
    start: { x: marge, y },
    end: { x: breedte - marge, y },
    thickness: 0.7,
    color: grijs,
  });
  y -= 18;
  tekst(`Totaal gewerkt (${totaalDagen} dagen)`, kolom.datum, y, { f: bold });
  tekst(kortUren(totaalUren), kolom.uren, y, { f: bold, kleur: merk });

  // Voettekst
  tekst(
    "Gegenereerd via het Sanitherm-personeelsportaal.",
    marge,
    marge,
    { size: 8, kleur: grijs }
  );

  const bytes = await pdf.save();

  const veiligeNaam = werknemer.naam.replace(/[^a-zA-Z0-9]+/g, "_");
  const bestandsnaam = `Tijdsregistratie_${veiligeNaam}_${van}_${tot}.pdf`;

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      // inline: opent in het nieuwe tabblad; van daaruit bewaren of printen.
      "Content-Disposition": `inline; filename="${bestandsnaam}"`,
      "Cache-Control": "no-store",
    },
  });
}
