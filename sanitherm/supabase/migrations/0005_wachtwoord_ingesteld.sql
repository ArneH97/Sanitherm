-- ============================================================
-- Sanitherm — Migratie 0005
-- Vlag om te forceren dat een werknemer bij de eerste aanmelding
-- (met het tijdelijke wachtwoord) een eigen wachtwoord instelt.
-- ============================================================
-- Uit te voeren in de Supabase SQL Editor.
-- ============================================================

alter table public.werknemers
  add column if not exists wachtwoord_ingesteld boolean not null default false;

-- Bestaande accounts hebben hun wachtwoord al in gebruik: niet forceren.
update public.werknemers set wachtwoord_ingesteld = true;

-- Nieuwe accounts krijgen 'false' (de kolom-default) en worden dus wel
-- verplicht om een eigen wachtwoord te kiezen.
