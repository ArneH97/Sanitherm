-- ============================================================
-- Sanitherm — Migratie 0009
-- Extra verlofsoorten uit het sociaal reglement / de Belgische
-- wetgeving: geboorteverlof (vaderschap), rouwverlof (overlijden),
-- huwelijk en ouderschapsverlof. (Klein verlet en onbetaald verlof
-- bestonden al.)
-- ============================================================
-- Uit te voeren in de Supabase SQL Editor.
-- ============================================================

alter type verlof_type add value if not exists 'geboorteverlof';
alter type verlof_type add value if not exists 'rouwverlof';
alter type verlof_type add value if not exists 'huwelijk';
alter type verlof_type add value if not exists 'ouderschapsverlof';
