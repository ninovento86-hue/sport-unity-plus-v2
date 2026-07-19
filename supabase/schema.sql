-- =========================================================
-- SCHEMA "Portale PT" — esegui questo file nell'SQL Editor
-- di Supabase (Project > SQL Editor > New query > Run)
-- =========================================================

-- ---------------------------------------------------------
-- 1. PROFILI (un profilo per ogni utente: trainer o cliente)
-- ---------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'cliente' check (role in ('trainer', 'cliente')),
  nome_completo text not null,
  email text,
  attivo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Funzione di supporto: l'utente loggato è il trainer?
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
-- 2. SCHEDA CLIENTE — dati e note gestiti SOLO dal trainer
--    (obiettivo, note tecniche). Il cliente le vede, non le
--    modifica.
-- ---------------------------------------------------------
create table if not exists dati_cliente (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  obiettivo text,
  note_trainer text,
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
-- 3. SCHEDE DI ALLENAMENTO — scritte dal trainer, sola
--    lettura per il cliente.
-- ---------------------------------------------------------
create table if not exists schede_allenamento (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  titolo text not null,
  contenuto text not null, -- testo libero/markdown della scheda
  attiva boolean not null default true,
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
-- 4. PROGRESSI (peso, misure, note) — QUI il cliente PUÒ
--    scrivere le proprie voci. Il trainer vede tutto.
-- ---------------------------------------------------------
create table if not exists progressi (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  data date not null default current_date,
  peso_kg numeric(5,2),
  nota text,
  inserito_da text not null default 'cliente' check (inserito_da in ('trainer', 'cliente')),
  created_at timestamptz not null default now()
);

alter table progressi enable row level security;

create policy "trainer gestisce tutti i progressi"
  on progressi for all
  using (is_trainer())
  with check (is_trainer());

create policy "cliente gestisce i propri progressi"
  on progressi for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());


-- ---------------------------------------------------------
-- 5. FOTO PROGRESSI — il cliente può caricare le proprie.
--    (i file veri e propri vanno nello Storage bucket
--    "foto-progressi", qui salviamo solo il riferimento)
-- ---------------------------------------------------------
create table if not exists foto_progressi (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete cascade,
  storage_path text not null,
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
-- 6. STORAGE — bucket privato per le foto progressi
--    (crealo anche da Dashboard > Storage se preferisci,
--    questo blocco lo fa via SQL)
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
-- 7. Trigger: crea automaticamente un profilo "cliente"
--    quando il trainer invita un nuovo utente da Supabase
--    Auth (così non serve farlo a mano ogni volta).
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
-- 8. IMPORTANTE: il primo account trainer va promosso a mano.
--    Dopo esserti registrato la prima volta con la tua email,
--    esegui (sostituendo la tua email):
--
--    update profiles set role = 'trainer'
--    where email = 'tuaemail@esempio.it';
-- ---------------------------------------------------------
