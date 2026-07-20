-- ============================================================
-- Sanitherm — Migratie 0002
-- 'overuren' toevoegen als verlofsoort.
-- Een werknemer kan verlof opnemen van zijn wettelijk verlof, zijn
-- ADV-inhaalrust, of van zijn opgebouwde overuren (inhaalrust).
-- ============================================================
-- Uit te voeren in de Supabase SQL Editor.
-- LET OP: 'alter type ... add value' mag NIET in een transactieblok draaien.
-- Voer deze regel dus apart uit (de SQL Editor doet dit standaard goed).
-- ============================================================

alter type verlof_type add value if not exists 'overuren';
