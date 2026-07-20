-- ============================================================
-- Sanitherm — Migratie 0007
-- Push-abonnementen: per toestel van een werknemer bewaren we de
-- gegevens om een pushmelding te kunnen versturen (herinnering om de
-- week te bevestigen).
-- ============================================================
-- Uit te voeren in de Supabase SQL Editor.
-- ============================================================

create table if not exists public.push_abonnementen (
  id            uuid primary key default gen_random_uuid(),
  werknemer_id  uuid not null references public.werknemers (id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  aangemaakt_op timestamptz not null default now()
);

create index if not exists push_abonnementen_werknemer_idx
  on public.push_abonnementen (werknemer_id);

alter table public.push_abonnementen enable row level security;

drop policy if exists push_abonnementen_eigen on public.push_abonnementen;
create policy push_abonnementen_eigen on public.push_abonnementen
  for all
  using (werknemer_id = auth.uid() or public.is_zaakvoerder())
  with check (werknemer_id = auth.uid() or public.is_zaakvoerder());
