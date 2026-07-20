-- ============================================================
-- Sanitherm — Migratie 0006
-- Overuren die de zaakvoerder periodiek uitbetaalt. Elke uitbetaling
-- verlaagt het beschikbare overuren-saldo van de werknemer.
-- ============================================================
-- Uit te voeren in de Supabase SQL Editor.
-- ============================================================

create table if not exists public.overuren_uitbetalingen (
  id              uuid primary key default gen_random_uuid(),
  werknemer_id    uuid not null references public.werknemers (id) on delete cascade,
  uren            numeric(6,2) not null check (uren > 0),
  tarief          numeric(8,2),          -- prijs per overuur op moment van uitbetaling
  bedrag          numeric(10,2),         -- uren × tarief
  uitbetaald_door uuid references public.werknemers (id),
  uitbetaald_op   timestamptz not null default now(),
  opmerking       text
);

create index if not exists overuren_uitbetalingen_werknemer_idx
  on public.overuren_uitbetalingen (werknemer_id);

alter table public.overuren_uitbetalingen enable row level security;

-- Werknemer ziet zijn eigen uitbetalingen; de zaakvoerder beheert alles.
drop policy if exists overuren_uitbetalingen_select on public.overuren_uitbetalingen;
create policy overuren_uitbetalingen_select on public.overuren_uitbetalingen
  for select using (werknemer_id = auth.uid() or public.is_zaakvoerder());

drop policy if exists overuren_uitbetalingen_beheer on public.overuren_uitbetalingen;
create policy overuren_uitbetalingen_beheer on public.overuren_uitbetalingen
  for all using (public.is_zaakvoerder()) with check (public.is_zaakvoerder());
