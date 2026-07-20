-- =========================================================
-- Migrazione v4 — da eseguire nell'SQL Editor di Supabase.
-- Aggiunge il carico (peso) corrente per ogni esercizio,
-- aggiornabile sia dal trainer sia dal cliente.
-- =========================================================

create table if not exists carichi_esercizio (
  esercizio_id uuid primary key references esercizi (id) on delete cascade,
  client_id uuid not null references profiles (id) on delete cascade,
  carico_kg numeric(6,2),
  aggiornato_da text not null default 'cliente' check (aggiornato_da in ('trainer', 'cliente')),
  updated_at timestamptz not null default now()
);

alter table carichi_esercizio enable row level security;

create policy "trainer gestisce tutti i carichi"
  on carichi_esercizio for all
  using (is_trainer())
  with check (is_trainer());

create policy "cliente gestisce i propri carichi"
  on carichi_esercizio for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());
