-- ============================================================
-- Sanitherm — Migratie 0004
-- Soort dag per tijdsregistratie: gewone werkdag, weekendwerk of
-- bouwverlof. Weekend- en bouwverlof-uren tellen volledig als overuren.
-- ============================================================
-- Uit te voeren in de Supabase SQL Editor.
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'dag_soort') then
    create type dag_soort as enum ('gewoon', 'weekend', 'bouwverlof');
  end if;
end
$$;

alter table public.tijdsregistraties
  add column if not exists soort dag_soort not null default 'gewoon';
