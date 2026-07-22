-- ============================================================
-- Sanitherm — Migratie 0008
-- 1) Dagdeel bij verlof (hele dag / voormiddag / namiddag)
-- 2) Herinneringsvlag voor ontbrekende ziekte-attesten
-- 3) Contactgegevens per werknemer (voor de contactkaart)
-- ============================================================
-- Uit te voeren in de Supabase SQL Editor.
-- ============================================================

-- 1) Dagdeel
do $$
begin
  if not exists (select 1 from pg_type where typname = 'dagdeel') then
    create type dagdeel as enum ('hele_dag', 'voormiddag', 'namiddag');
  end if;
end
$$;

alter table public.verlofaanvragen
  add column if not exists dagdeel dagdeel not null default 'hele_dag';

-- 2) Ziekte-attest herinnering
alter table public.ziektemeldingen
  add column if not exists attest_herinnerd boolean not null default false;

-- 3) Contactgegevens
alter table public.werknemers
  add column if not exists voornaam        text,
  add column if not exists achternaam      text,
  add column if not exists adres           text,
  add column if not exists geboortedatum   date,
  add column if not exists gsm             text,
  add column if not exists noodcontact_naam text,
  add column if not exists noodcontact_gsm  text;
