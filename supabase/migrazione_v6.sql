-- =========================================================
-- Migrazione v6 — da eseguire nell'SQL Editor di Supabase.
-- Aggiunge la distinzione tra piano Plus e Premium.
-- =========================================================

alter table dati_cliente
  add column if not exists piano text not null default 'plus' check (piano in ('plus', 'premium'));

alter table dati_cliente
  add column if not exists piano_alimentare text;

alter table check_valutazioni
  add column if not exists risposta_trainer text;
