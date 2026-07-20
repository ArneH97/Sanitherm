-- ============================================================
-- Sanitherm — Migratie 0003
-- Weekschema per werknemer (uren per dag) + prijs per overuur.
-- Het gewone uurloon vervalt in de app (kolom blijft bestaan maar
-- wordt niet meer gebruikt).
-- ============================================================
-- Uit te voeren in de Supabase SQL Editor.
-- ============================================================

alter table public.werknemers
  add column if not exists overuur_prijs numeric(8,2),
  add column if not exists rooster_ma numeric(4,2) not null default 8,
  add column if not exists rooster_di numeric(4,2) not null default 8,
  add column if not exists rooster_wo numeric(4,2) not null default 8,
  add column if not exists rooster_do numeric(4,2) not null default 8,
  add column if not exists rooster_vr numeric(4,2) not null default 8,
  add column if not exists rooster_za numeric(4,2) not null default 0,
  add column if not exists rooster_zo numeric(4,2) not null default 0;
