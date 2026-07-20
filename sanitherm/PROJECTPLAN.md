# Sanitherm — Personeelsportaal & Zaakvoerderoverzicht

**Projectplan v1** · opgesteld 19 juli 2026 · sector PC 124 (bouw)

Dit document beschrijft *wat* we bouwen en *hoe* de data eruitziet, vóór er een regel code geschreven wordt. Onderdelen die nog bevestigd moeten worden staan gemarkeerd met ⚠️.

---

## 1. Doel & rollen

Een webapp waarin arbeiders hun tijd registreren en verlof/ziekte beheren, en waarin de zaakvoerder (jouw vader) alles goedkeurt en overziet.

**Twee rollen:**

- **Arbeider** — checkt in/uit via de gsm, bevestigt wekelijks zijn uren, vraagt verlof aan, meldt zich ziek.
- **Zaakvoerder** — keurt aanvragen goed, stelt per arbeider instellingen in (uurrooster, uurloon, verloftellers), en downloadt tijdsregistraties als pdf.

Aantal gebruikers: 2 tot 10 arbeiders + 1 zaakvoerder. Taal: volledig Nederlands.

---

## 2. Techniekstack

Gekozen op basis van wat je al hebt (Vercel + Supabase):

- **Next.js** (App Router) op **Vercel** — frontend + serverlogica in één project.
- **Supabase** — database (PostgreSQL), authenticatie (elke arbeider een eigen account), en bestandsopslag voor de ziekte-attesten.
- **Row Level Security (RLS)** in Supabase — zorgt dat een arbeider enkel zijn eigen gegevens ziet en enkel de zaakvoerder alles ziet. Dit is de kern van de beveiliging.
- **pdf-generatie** server-side voor de tijdsregistratie-export.

Mobiel-eerst ontworpen (arbeiders klokken op de gsm), maar werkt ook op desktop voor de zaakvoerder.

---

## 3. Datamodel (Supabase-tabellen)

Kort overzicht van de tabellen en hun belangrijkste velden.

**`werknemers`** — profiel per arbeider
`id`, `naam`, `email`, `rol` (arbeider/zaakvoerder), `actief`, `startdatum`, `standaard_uren_per_dag` (default 8), `standaard_uren_per_week` (default 40), `uurloon`, `regio` (voor bouwverlof).

**`uurroosters`** — aanpasbaar rooster per arbeider ⚠️
Laat toe om per arbeider af te wijken van 8u/40u. Velden: `werknemer_id`, `dag`, `uren`, `geldig_vanaf`.

**`tijdsregistraties`** — één rij per gewerkte dag
`werknemer_id`, `datum`, `checkin`, `checkout`, `pauze_minuten`, `gewerkte_uren` (berekend), `status` (open/bevestigd/goedgekeurd), `handmatig_aangepast` (ja/nee).

**`registratie_wijzigingen`** — audit-log van correcties
Elke keer dat een arbeider een tijd corrigeert (bv. te laat ingecheckt), bewaren we: `registratie_id`, `oude_waarde`, `nieuwe_waarde`, `gewijzigd_door`, `tijdstip`. Zo blijft alles traceerbaar.

**`weekbevestigingen`** — wekelijkse bevestiging van uren
`werknemer_id`, `week` (jaar+weeknummer), `totaal_uren`, `overuren`, `bevestigd_op`, `goedgekeurd_door`.

**`verlofaanvragen`**
`werknemer_id`, `type` (wettelijk verlof / ADV-inhaalrust / onbetaald / ...), `van`, `tot`, `aantal_dagen`, `status` (aangevraagd/goedgekeurd/geweigerd), `beoordeeld_door`, `reden_weigering`.

**`verloftellers`** — saldo per arbeider per jaar, door zaakvoerder ingesteld
`werknemer_id`, `jaar`, `wettelijk_verlof_totaal`, `wettelijk_verlof_opgenomen`, `adv_totaal` (12 inhaalrustdagen, zie §5), `adv_opgenomen`.

**`ziektemeldingen`**
`werknemer_id`, `van`, `tot`, `attest_bestand` (verwijzing naar Supabase Storage), `gemeld_op`, `zaakvoerder_verwittigd`.

**`bouwverlof`** — vaste collectieve sluitingsdagen per jaar/regio (zie §5)
`jaar`, `regio`, `van`, `tot`.

**`instellingen`** — globale instellingen door zaakvoerder
o.a. hoe overuren opgenomen mogen worden (uitbetalen / recupereren), overurentoeslagen.

---

## 4. Schermen

### Voor de arbeider (mobiel)
- **Vandaag** — grote "Inchecken" / "Uitchecken"-knop, met mogelijkheid om de tijd te corrigeren als hij te laat was (correctie wordt gelogd).
- **Mijn week** — overzicht van de dagen, totaal uren + overuren, knop "Week bevestigen".
- **Verlof** — verlof aanvragen, overzicht gepland verlof, verlofteller (resterende dagen), en het bouwverlof zichtbaar in de kalender.
- **Ziek melden** — periode ingeven + attest (foto/pdf) uploaden.

### Voor de zaakvoerder
- **Dashboard** — wie is vandaag ingecheckt, openstaande goedkeuringen.
- **Goedkeuringen** — verlofaanvragen en weekbevestigingen goedkeuren/weigeren.
- **Per werknemer** — instellingen (rooster, uurloon, verloftellers), historiek.
- **Overuren** — totaal in geld per arbeider, met instelling voor opname.
- **Export** — tijdsregistraties per arbeider/periode downloaden als **pdf**.
- **Meldingen** — nieuwe ziekmeldingen en aanvragen.

---

## 5. Ingebouwde PC 124-regels (opgezocht & bevestigd)

- **Arbeidsduur:** 40 u/week en 8 u/dag als standaard, **aanpasbaar per arbeider** via het uurrooster.
- **12 inhaalrustdagen (ADV):** in PC 124 werkt men 40 u/week, maar krijgt men jaarlijks **12 inhaalrustdagen** om aan een gemiddelde van 38 u/week te komen (6 via sectorale cao + 6 via KB). Deze zetten we in de verlofteller als aparte pot naast het wettelijk verlof. De data verschillen per regime (Vlaanderen vs. Wallonië).
- **Bouwverlof 2026:** collectieve sluiting — voor **provincie Antwerpen** aanbevolen van **13 t.e.m. 31 juli 2026**. Dit zijn aanbevelingen die pas juridisch vastliggen zodra ze in het arbeidsreglement staan. ⚠️ Ik moet weten in welke **provincie** Sanitherm valt om de juiste data te laden.
- **Overuren:** worden opgeteld en **in geld** weergegeven (uurloon × uren, eventueel × wettelijke toeslag). De zaakvoerder stelt in hoe ze opgenomen worden (uitbetalen of recupereren). ⚠️ Zie open punt over toeslagen.

*Bronnen onderaan.*

---

## 6. Goedkeuringsstroom

1. Arbeider dient in (weekuren / verlof / ziekte).
2. Zaakvoerder krijgt een **melding** en ziet het bij "Goedkeuringen".
3. Zaakvoerder keurt goed of weigert (met reden).
4. Bij ziekte: melding + attest komen meteen bij de zaakvoerder terecht.
5. Alle correcties op tijdsregistraties blijven bewaard in de audit-log.

---

## 7. Nog te bevestigen ⚠️

1. **Uurloon & overurentoeslag** — Per arbeider een uurloon om overuren in geld te tonen. Passen we de wettelijke toeslagen toe (bv. +50 % op weekdagen, +100 % op zon-/feestdagen), of gewoon het normale uurloon × aantal overuren? Wie vult de uurlonen in — jij/je vader in de app?
2. **Provincie** waar Sanitherm valt (voor de juiste bouwverlofdata).
3. **Accounts aanmaken** — Maakt de zaakvoerder de accounts aan en nodigt hij arbeiders uit (mijn voorstel), of registreren arbeiders zelf met een uitnodigingslink?
4. **Pauzes** — Wordt er een vaste (bv. onbetaalde) pauze per dag afgetrokken, of geven arbeiders die zelf in?
5. **Bewaartermijn attesten** — Zijn er afspraken over hoelang ziekte-attesten bewaard mogen worden (privacy)?

---

## 8. Voorgestelde bouwvolgorde

- **Fase 1 — Fundament:** project opzetten (Next.js + Supabase), datamodel + RLS, inloggen, accounts.
- **Fase 2 — Tijdsregistratie:** in-/uitchecken, correcties + audit-log, weekoverzicht en -bevestiging, overurenberekening.
- **Fase 3 — Verlof & ziekte:** aanvragen, verloftellers, bouwverlof/ADV in de kalender, ziekmelding + attest-upload.
- **Fase 4 — Zaakvoerder:** dashboard, goedkeuringen, per-werknemer-instellingen, overuren in geld, pdf-export, meldingen.
- **Fase 5 — Afwerking:** e-mail/pushmeldingen, koppeling aan je domein, testen met een paar echte accounts.

---

## Bronnen
- [PC 124: Bouwverlof 2026 — Sodibe](https://www.sodibe.be/nieuws/pc-124-bouwverlof-2026)
- [Verplichte inhaalrustdagen in de bouwsector gewijzigd vanaf 2026 — Securex](https://www.securex.be/nl/lex4you/werkgever/nieuws/verplichte-inhaalrustdagen-in-de-bouwsector-gewijzigd-vanaf-2026)
- [Bouwkalender 2026 is bekend — Securex](https://www.securex.be/nl/lex4you/werkgever/nieuws/bouwkalender-2026-is-bekend)
