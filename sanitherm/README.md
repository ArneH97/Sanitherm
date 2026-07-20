# Sanitherm — Personeelsportaal

Tijdsregistratie, verlof en ziektemelding voor de arbeiders van Sanitherm (PC 124, Oost-Vlaanderen), met een overzicht en goedkeuringen voor de zaakvoerder.

Stack: **Next.js** (App Router) op **Vercel** + **Supabase** (database, auth, bestandsopslag).

---

## Wat er nu al klaar is

- ✅ **Datamodel + beveiliging** — `supabase/migrations/0001_init.sql`. Alle tabellen, Row Level Security (arbeider ziet enkel zichzelf, zaakvoerder ziet alles), automatische profielaanmaak bij nieuwe accounts, en de bouwverlofdata 2026. Getest tegen een echte Postgres.
- ✅ **Inloggen + rol-gebaseerde toegang** — loginscherm, sessiebeheer via middleware, aparte navigatie voor arbeider en zaakvoerder.
- ✅ **Tijdsregistratie (arbeider)** — in-/uitchecken op de gsm, tijd corrigeren (met audit-log), weekoverzicht met totaal + overuren, en week bevestigen.
- ✅ **Overzicht (zaakvoerder)** — wie is vandaag aanwezig, aantal arbeiders en openstaande aanvragen.
- ⏳ **Volgende fases** — verlof, ziekmelding + attest, goedkeuringen, per-werknemer-instellingen en pdf-export.

De reken-logica (uren, weeknummers, zomer-/wintertijd) is apart getest.

---

## Opzet — stap voor stap

### 1. Supabase klaarzetten

1. Ga naar je Supabase-project → **SQL Editor**.
2. Plak de volledige inhoud van `supabase/migrations/0001_init.sql` en klik **Run**. Je zou geen fouten mogen krijgen.
3. Ga naar **Storage** → maak een bucket met de naam **`attesten`** en zet die op **Private** (ziekte-attesten mogen niet publiek zijn).
4. Ga naar **Project Settings → API** en noteer:
   - `Project URL`
   - `anon public` key
   - `service_role` key ⚠️ *geheim — enkel voor serverkant, nooit in de frontend of in Git.*

### 2. De eerste zaakvoerder aanmaken

De trigger maakt automatisch een profiel aan, maar de allereerste gebruiker (jouw vader) moet je als zaakvoerder markeren:

1. **Authentication → Users → Add user** → e-mail + wachtwoord van je vader.
2. Terug in de **SQL Editor**:
   ```sql
   update public.werknemers
   set rol = 'zaakvoerder', naam = 'Naam van je vader'
   where email = 'baas@sanitherm.be';
   ```
   Nadien maakt hij de arbeiders aan vanuit de app (of via **Add user**), en zij krijgen automatisch de rol `arbeider`.

### 3. GitHub-repo aanmaken

Je hebt nog geen repo. In de projectmap:
```bash
git init
git add .
git commit -m "Sanitherm portaal — fundering"
gh repo create sanitherm --private --source=. --push
```
(Of maak de repo manueel aan op github.com en push.)

### 4. Vercel koppelen

1. Vercel → **Add New → Project** → kies de `sanitherm`-repo.
2. Zet bij **Environment Variables**:
   | Naam | Waarde |
   |------|--------|
   | `NEXT_PUBLIC_SUPABASE_URL` | je Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | je anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | je service_role key (geheim) |
3. **Deploy**. Vercel installeert zelf alle dependencies — daar hoef je lokaal niets voor te doen.
4. Koppel later je aangekochte domein onder **Settings → Domains**.

### 5. Lokaal draaien (optioneel)

```bash
cp .env.example .env.local   # vul je Supabase-gegevens in
npm install
npm run dev
```

---

## De ingebouwde PC 124-regels

- **40 u/week, 8 u/dag** als standaard, aanpasbaar per arbeider (`werknemers.standaard_uren_*` en de tabel `uurroosters`).
- **12 inhaalrustdagen (ADV)** per jaar in de verlofteller, naast het wettelijk verlof.
- **Bouwverlof 2026 Oost-Vlaanderen:** 13 t.e.m. 31 juli 2026 (al ingeladen).
- **Overuren** worden getoond in geld (uurloon × overuren, **zonder** wettelijke toeslag — jouw keuze; `instellingen.overuren_toeslag_actief = false`). De zaakvoerder stelt in of ze gerecupereerd of uitbetaald worden.
- **Pauze:** vaste aftrek per dag (standaard 30 min, instelbaar).
- **Correcties** op tijdsregistraties worden altijd bewaard in `registratie_wijzigingen`.

---

## Structuur

```
sanitherm/
├── app/
│   ├── (app)/                 # afgeschermd deel (ingelogd)
│   │   ├── layout.tsx         # navigatie per rol
│   │   ├── vandaag/           # in-/uitchecken + correctie (arbeider)
│   │   ├── week/              # weekoverzicht + bevestigen (arbeider)
│   │   ├── verlof/ ziek/      # placeholders (volgende fase)
│   │   └── beheer/            # overzicht + placeholders (zaakvoerder)
│   ├── login/                 # loginscherm
│   ├── auth/signout/          # afmelden
│   └── layout.tsx globals.css
├── lib/
│   ├── supabase/              # client-, server- en middleware-clients
│   ├── uren.ts                # uren/week/tijdzone-berekening (getest)
│   ├── types.ts werknemer.ts
├── components/Binnenkort.tsx
├── middleware.ts              # sessie + routebeveiliging
├── supabase/migrations/0001_init.sql   # datamodel + RLS + seed (getest)
├── package.json  tsconfig.json  tailwind.config.ts  ...
└── README.md
```
