-- =========================================================
-- SCHEMA "Portale PT" v2 — sostituisce interamente lo schema
-- precedente. Esegui prima reset-schema.sql (se hai già
-- creato le tabelle v1), poi questo file.
-- =========================================================

-- ---------------------------------------------------------
-- 1. PROFILI
-- ---------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'cliente' check (role in ('trainer', 'cliente')),
  nome_completo text not null,
  email text,
  attivo boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function is_trainer()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'trainer'
  );
$$;

alter table profiles enable row level security;

create policy "trainer vede tutti i profili"
  on profiles for select
  using (is_trainer() or id = auth.uid());

create policy "trainer crea/modifica profili"
  on profiles for all
  using (is_trainer())
  with check (is_trainer());

create policy "cliente aggiorna solo il proprio nome"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());


-- ---------------------------------------------------------
-- 2. SCHEDA CLIENTE — obiettivo, note trainer, e data della
--    prossima valutazione (per il calendario).
-- ---------------------------------------------------------
create table if not exists dati_cliente (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  obiettivo text,
  note_trainer text,
  prossima_valutazione date,
  updated_at timestamptz not null default now()
);

alter table dati_cliente enable row level security;

create policy "trainer gestisce dati_cliente"
  on dati_cliente for all
  using (is_trainer())
  with check (is_trainer());

create policy "cliente legge i propri dati"
  on dati_cliente for select
  using (client_id = auth.uid());


-- ---------------------------------------------------------
-- 3. SCHEDE DI ALLENAMENTO — una riga per scheda, con lo
--    storico (le vecchie restano "attiva = false").
-- ---------------------------------------------------------
create table if not exists schede_allenamento (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  titolo text not null,
  attiva boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table schede_allenamento enable row level security;

create policy "trainer gestisce schede"
  on schede_allenamento for all
  using (is_trainer())
  with check (is_trainer());

create policy "cliente legge le proprie schede"
  on schede_allenamento for select
  using (client_id = auth.uid());


-- ---------------------------------------------------------
-- 4. ESERCIZI — righe singole dentro una scheda, con tempo
--    di recupero in secondi (usato dal timer lato cliente).
-- ---------------------------------------------------------
create table if not exists esercizi (
  id uuid primary key default gen_random_uuid(),
  scheda_id uuid not null references schede_allenamento (id) on delete cascade,
  ordine integer not null default 0,
  nome text not null,
  serie integer,
  ripetizioni text,       -- testo per permettere "8-10", "AMRAP", ecc.
  recupero_secondi integer not null default 90,
  note text
);

alter table esercizi enable row level security;

create policy "trainer gestisce esercizi"
  on esercizi for all
  using (is_trainer())
  with check (is_trainer());

create policy "cliente legge gli esercizi delle proprie schede"
  on esercizi for select
  using (
    exists (
      select 1 from schede_allenamento s
      where s.id = esercizi.scheda_id and s.client_id = auth.uid()
    )
  );


-- ---------------------------------------------------------
-- 5. CHECK DI VALUTAZIONE — peso, massa grassa/magra,
--    circonferenze. Storico completo, modificabile dal
--    cliente (voci proprie) o dal trainer.
-- ---------------------------------------------------------
create table if not exists check_valutazioni (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  data date not null default current_date,
  peso_kg numeric(5,2),
  massa_grassa_percentuale numeric(4,1),
  massa_magra_percentuale numeric(4,1),
  vita_cm numeric(5,1),
  fianchi_cm numeric(5,1),
  petto_cm numeric(5,1),
  braccio_cm numeric(5,1),
  coscia_cm numeric(5,1),
  nota text,
  inserito_da text not null default 'cliente' check (inserito_da in ('trainer', 'cliente')),
  created_at timestamptz not null default now()
);

alter table check_valutazioni enable row level security;

create policy "trainer gestisce tutti i check"
  on check_valutazioni for all
  using (is_trainer())
  with check (is_trainer());

create policy "cliente gestisce i propri check"
  on check_valutazioni for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());


-- ---------------------------------------------------------
-- 6. FOTO PROGRESSI — con tipo (frontale/laterale/retro),
--    raggruppabili per data_scatto.
-- ---------------------------------------------------------
create table if not exists foto_progressi (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  storage_path text not null,
  tipo text not null check (tipo in ('frontale', 'laterale', 'retro')),
  data_scatto date not null default current_date,
  caricato_da text not null default 'cliente' check (caricato_da in ('trainer', 'cliente')),
  created_at timestamptz not null default now()
);

alter table foto_progressi enable row level security;

create policy "trainer gestisce tutte le foto"
  on foto_progressi for all
  using (is_trainer())
  with check (is_trainer());

create policy "cliente gestisce le proprie foto"
  on foto_progressi for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());


-- ---------------------------------------------------------
-- 7. STORAGE — bucket privato per le foto progressi
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('foto-progressi', 'foto-progressi', false)
on conflict (id) do nothing;

create policy "trainer accede a tutte le foto nello storage"
  on storage.objects for all
  using (bucket_id = 'foto-progressi' and is_trainer())
  with check (bucket_id = 'foto-progressi' and is_trainer());

create policy "cliente accede alla propria cartella nello storage"
  on storage.objects for all
  using (
    bucket_id = 'foto-progressi'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'foto-progressi'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ---------------------------------------------------------
-- 8. Trigger: crea automaticamente un profilo "cliente"
-- ---------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, nome_completo, email)
  values (
    new.id,
    'cliente',
    coalesce(new.raw_user_meta_data->>'nome_completo', new.email),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------------------------------------------------------
-- 9. Il primo account trainer va promosso a mano (come prima):
--
--    update profiles set role = 'trainer'
--    where email = 'tuaemail@esempio.it';
-- ---------------------------------------------------------
