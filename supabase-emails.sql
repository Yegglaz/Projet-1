-- À exécuter UNE fois dans Supabase (SQL Editor) pour activer les alertes email
create table if not exists abonnes (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  pseudo text,
  actif boolean not null default true,
  sujets text[] not null default '{}',
  token uuid not null default gen_random_uuid(),
  dernier_envoi timestamptz not null default now()
);
alter table abonnes enable row level security;
create policy "abo lecture" on abonnes for select using (auth.uid() = id);
create policy "abo insertion" on abonnes for insert with check (auth.uid() = id);
create policy "abo maj" on abonnes for update using (auth.uid() = id);

-- Si la table existait déjà (version précédente), ajoute la colonne pseudo :
alter table abonnes add column if not exists pseudo text;
