-- =========================================================
-- Migrazione v5 — da eseguire nell'SQL Editor di Supabase.
-- Trasforma "carichi_esercizio" in uno storico (più voci nel
-- tempo per esercizio) invece di un solo valore corrente,
-- necessario per mostrare il grafico dei progressi al trainer.
-- =========================================================

alter table carichi_esercizio drop constraint if exists carichi_esercizio_pkey;

alter table carichi_esercizio
  add column if not exists id uuid not null default gen_random_uuid();

alter table carichi_esercizio
  add column if not exists data date not null default current_date;

alter table carichi_esercizio add primary key (id);
