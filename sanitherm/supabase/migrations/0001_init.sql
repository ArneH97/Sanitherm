-- ============================================================
-- Sanitherm personeelsportaal — datamodel + RLS
-- PC 124 (bouw) · Oost-Vlaanderen
-- Migratie 0001 — initieel schema
-- ============================================================
-- Uit te voeren in de Supabase SQL Editor (of via `supabase db push`).
-- Veronderstelt de standaard Supabase-schema's `auth` en `storage`.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- ENUM-types
-- ------------------------------------------------------------
create type rol as enum ('arbeider', 'zaakvoerder');

create type registratie_status as enum ('open', 'bevestigd', 'goedgekeurd');

create type verlof_type as enum (
  'wettelijk_verlof',   -- betaald jaarlijks verlof
  'adv_inhaalrust',     -- de 12 inhaalrustdagen PC 124
  'onbetaald',
  'klein_verlet',       -- kort verzuim (huwelijk, overlijden, ...)
  'ander'
);

create type aanvraag_status as enum ('aangevraagd', 'goedgekeurd', 'geweigerd', 'geannuleerd');

-- ------------------------------------------------------------
-- werknemers — profiel per gebruiker, 1-op-1 met auth.users
-- ------------------------------------------------------------
create table public.werknemers (
  id                       uuid primary key references auth.users (id) on delete cascade,
  naam                     text not null,
  email                    text not null,
  rol                      rol  not null default 'arbeider',
  actief                   boolean not null default true,
  startdatum               date,
  provincie                text not null default 'Oost-Vlaanderen',
  -- standaardrooster, aanpasbaar per arbeider
  standaard_uren_per_dag   numeric(4,2) not null default 8.0,
  standaard_uren_per_week  numeric(4,2) not null default 40.0,
  -- vaste pauze die per gewerkte dag wordt afgetrokken (keuze: vaste aftrek)
  standaard_pauze_minuten  integer not null default 30,
  uurloon                  numeric(8,2),         -- door zaakvoerder ingesteld; voor overuren in geld
  aangemaakt_op            timestamptz not null default now()
);

comment on table public.werknemers is 'Profiel per gebruiker; rol bepaalt rechten (RLS).';

-- ------------------------------------------------------------
-- uurroosters — afwijkend rooster per arbeider (optioneel)
-- ------------------------------------------------------------
create table public.uurroosters (
  id              uuid primary key default gen_random_uuid(),
  werknemer_id    uuid not null references public.werknemers (id) on delete cascade,
  dag             smallint not null check (dag between 1 and 7), -- 1 = maandag
  uren            numeric(4,2) not null default 8.0,
  geldig_vanaf    date not null default current_date,
  unique (werknemer_id, dag, geldig_vanaf)
);

-- ------------------------------------------------------------
-- tijdsregistraties — één rij per gewerkte dag
-- ------------------------------------------------------------
create table public.tijdsregistraties (
  id                 uuid primary key default gen_random_uuid(),
  werknemer_id       uuid not null references public.werknemers (id) on delete cascade,
  datum              date not null,
  checkin            timestamptz,
  checkout           timestamptz,
  pauze_minuten      integer not null default 30,
  -- gewerkte uren = (checkout - checkin) - pauze; berekend in app/trigger
  gewerkte_uren      numeric(5,2),
  status             registratie_status not null default 'open',
  handmatig_aangepast boolean not null default false,
  opmerking          text,
  aangemaakt_op      timestamptz not null default now(),
  unique (werknemer_id, datum)
);

create index on public.tijdsregistraties (werknemer_id, datum);

-- ------------------------------------------------------------
-- registratie_wijzigingen — audit-log van correcties
-- ------------------------------------------------------------
create table public.registratie_wijzigingen (
  id              uuid primary key default gen_random_uuid(),
  registratie_id  uuid not null references public.tijdsregistraties (id) on delete cascade,
  veld            text not null,           -- bv. 'checkin', 'checkout', 'pauze_minuten'
  oude_waarde     text,
  nieuwe_waarde   text,
  gewijzigd_door  uuid not null references public.werknemers (id),
  tijdstip        timestamptz not null default now()
);

create index on public.registratie_wijzigingen (registratie_id);

-- ------------------------------------------------------------
-- weekbevestigingen — wekelijkse bevestiging van uren
-- ------------------------------------------------------------
create table public.weekbevestigingen (
  id              uuid primary key default gen_random_uuid(),
  werknemer_id    uuid not null references public.werknemers (id) on delete cascade,
  jaar            smallint not null,
  weeknummer      smallint not null check (weeknummer between 1 and 53),
  totaal_uren     numeric(6,2) not null default 0,
  overuren        numeric(6,2) not null default 0,   -- boven standaard_uren_per_week
  bevestigd_op    timestamptz,
  goedgekeurd_door uuid references public.werknemers (id),
  goedgekeurd_op  timestamptz,
  unique (werknemer_id, jaar, weeknummer)
);

-- ------------------------------------------------------------
-- verlofaanvragen
-- ------------------------------------------------------------
create table public.verlofaanvragen (
  id              uuid primary key default gen_random_uuid(),
  werknemer_id    uuid not null references public.werknemers (id) on delete cascade,
  type            verlof_type not null,
  van             date not null,
  tot             date not null,
  aantal_dagen    numeric(4,1) not null,
  reden           text,
  status          aanvraag_status not null default 'aangevraagd',
  beoordeeld_door uuid references public.werknemers (id),
  reden_weigering text,
  aangevraagd_op  timestamptz not null default now(),
  beoordeeld_op   timestamptz,
  check (tot >= van)
);

create index on public.verlofaanvragen (werknemer_id, status);

-- ------------------------------------------------------------
-- verloftellers — saldo per arbeider per jaar (door zaakvoerder ingesteld)
-- ------------------------------------------------------------
create table public.verloftellers (
  id                      uuid primary key default gen_random_uuid(),
  werknemer_id            uuid not null references public.werknemers (id) on delete cascade,
  jaar                    smallint not null,
  wettelijk_verlof_totaal numeric(4,1) not null default 20,
  wettelijk_verlof_opgenomen numeric(4,1) not null default 0,
  adv_totaal              numeric(4,1) not null default 12,  -- 12 inhaalrustdagen PC 124
  adv_opgenomen           numeric(4,1) not null default 0,
  unique (werknemer_id, jaar)
);

-- ------------------------------------------------------------
-- ziektemeldingen
-- ------------------------------------------------------------
create table public.ziektemeldingen (
  id                   uuid primary key default gen_random_uuid(),
  werknemer_id         uuid not null references public.werknemers (id) on delete cascade,
  van                  date not null,
  tot                  date,
  attest_pad           text,          -- pad in Supabase Storage bucket 'attesten'
  zaakvoerder_verwittigd boolean not null default false,
  gemeld_op            timestamptz not null default now(),
  check (tot is null or tot >= van)
);

create index on public.ziektemeldingen (werknemer_id);

-- ------------------------------------------------------------
-- bouwverlof — vaste collectieve sluitingsdagen per jaar/provincie
-- ------------------------------------------------------------
create table public.bouwverlof (
  id          uuid primary key default gen_random_uuid(),
  jaar        smallint not null,
  provincie   text not null,
  omschrijving text not null,
  van         date not null,
  tot         date not null,
  unique (jaar, provincie, van)
);

-- ------------------------------------------------------------
-- instellingen — globale instellingen (één rij, door zaakvoerder)
-- ------------------------------------------------------------
create table public.instellingen (
  id                        integer primary key default 1 check (id = 1),
  overuren_opname           text not null default 'recupereren',  -- 'recupereren' of 'uitbetalen'
  overuren_toeslag_actief   boolean not null default false,       -- keuze Arne: overuren zonder toeslag
  standaard_pauze_minuten   integer not null default 30
);

insert into public.instellingen (id) values (1) on conflict do nothing;

-- ============================================================
-- Helperfunctie: is de huidige gebruiker zaakvoerder?
-- SECURITY DEFINER om RLS-recursie op werknemers te vermijden.
-- ============================================================
create or replace function public.is_zaakvoerder()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.werknemers
    where id = auth.uid() and rol = 'zaakvoerder'
  );
$$;

-- ============================================================
-- Trigger: maak automatisch een werknemer-profiel bij nieuwe auth-user
-- Naam/rol komen uit de metadata die de zaakvoerder meegeeft bij uitnodiging.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.werknemers (id, naam, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'naam', new.email),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'rol')::rol, 'arbeider')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Row Level Security
-- Principe: een arbeider ziet/bewerkt enkel zijn eigen rijen;
-- de zaakvoerder ziet/bewerkt alles.
-- ============================================================
alter table public.werknemers            enable row level security;
alter table public.uurroosters           enable row level security;
alter table public.tijdsregistraties     enable row level security;
alter table public.registratie_wijzigingen enable row level security;
alter table public.weekbevestigingen     enable row level security;
alter table public.verlofaanvragen       enable row level security;
alter table public.verloftellers         enable row level security;
alter table public.ziektemeldingen       enable row level security;
alter table public.bouwverlof            enable row level security;
alter table public.instellingen          enable row level security;

-- werknemers: eigen profiel lezen; zaakvoerder alles; enkel zaakvoerder beheert
create policy werknemers_select on public.werknemers
  for select using (id = auth.uid() or public.is_zaakvoerder());
create policy werknemers_update_self on public.werknemers
  for update using (id = auth.uid() or public.is_zaakvoerder());
create policy werknemers_zaakvoerder_all on public.werknemers
  for all using (public.is_zaakvoerder()) with check (public.is_zaakvoerder());

-- Generieke "eigen rij of zaakvoerder"-policies per tabel
create policy uurroosters_rw on public.uurroosters
  for all using (werknemer_id = auth.uid() or public.is_zaakvoerder())
  with check (werknemer_id = auth.uid() or public.is_zaakvoerder());

create policy tijdsregistraties_rw on public.tijdsregistraties
  for all using (werknemer_id = auth.uid() or public.is_zaakvoerder())
  with check (werknemer_id = auth.uid() or public.is_zaakvoerder());

create policy registratie_wijzigingen_select on public.registratie_wijzigingen
  for select using (gewijzigd_door = auth.uid() or public.is_zaakvoerder());
create policy registratie_wijzigingen_insert on public.registratie_wijzigingen
  for insert with check (gewijzigd_door = auth.uid() or public.is_zaakvoerder());

create policy weekbevestigingen_rw on public.weekbevestigingen
  for all using (werknemer_id = auth.uid() or public.is_zaakvoerder())
  with check (werknemer_id = auth.uid() or public.is_zaakvoerder());

create policy verlofaanvragen_rw on public.verlofaanvragen
  for all using (werknemer_id = auth.uid() or public.is_zaakvoerder())
  with check (werknemer_id = auth.uid() or public.is_zaakvoerder());

-- verloftellers: arbeider mag enkel lezen; zaakvoerder beheert
create policy verloftellers_select on public.verloftellers
  for select using (werknemer_id = auth.uid() or public.is_zaakvoerder());
create policy verloftellers_zaakvoerder_write on public.verloftellers
  for all using (public.is_zaakvoerder()) with check (public.is_zaakvoerder());

create policy ziektemeldingen_rw on public.ziektemeldingen
  for all using (werknemer_id = auth.uid() or public.is_zaakvoerder())
  with check (werknemer_id = auth.uid() or public.is_zaakvoerder());

-- bouwverlof: iedereen mag lezen; enkel zaakvoerder schrijft
create policy bouwverlof_select on public.bouwverlof
  for select using (auth.uid() is not null);
create policy bouwverlof_zaakvoerder_write on public.bouwverlof
  for all using (public.is_zaakvoerder()) with check (public.is_zaakvoerder());

-- instellingen: iedereen mag lezen; enkel zaakvoerder schrijft
create policy instellingen_select on public.instellingen
  for select using (auth.uid() is not null);
create policy instellingen_zaakvoerder_write on public.instellingen
  for all using (public.is_zaakvoerder()) with check (public.is_zaakvoerder());

-- ============================================================
-- Seed: bouwverlof + wettelijke inhaalrustdagen (ADV) 2026
-- Bron: PC 124 bouwkalender 2026 (Oost-Vlaanderen).
-- ============================================================
insert into public.bouwverlof (jaar, provincie, omschrijving, van, tot) values
  (2026, 'Oost-Vlaanderen', 'Zomer-bouwverlof (collectieve sluiting)', '2026-07-13', '2026-07-31')
on conflict (jaar, provincie, van) do nothing;
