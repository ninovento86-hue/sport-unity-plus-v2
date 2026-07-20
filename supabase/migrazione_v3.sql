-- =========================================================
-- Migrazione v3: da eseguire nell'SQL Editor di Supabase.
-- Aggiunge la suddivisione in giornate e il video/gif
-- dimostrativo per ogni esercizio. Non tocca i dati esistenti.
-- =========================================================

alter table esercizi
  add column if not exists giorno text not null default 'Giorno 1';

alter table esercizi
  add column if not exists video_url text;
