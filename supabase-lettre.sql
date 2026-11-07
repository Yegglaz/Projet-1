-- À exécuter UNE fois dans Supabase (SQL Editor) : inscriptions par e-mail SANS compte
create table if not exists lettre (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  sujets text[] not null default '{}',
  token uuid not null default gen_random_uuid(),
  confirme boolean not null default false,
  actif boolean not null default true,
  demande_le timestamptz not null default now(),
  dernier_envoi timestamptz not null default now()
);
alter table lettre enable row level security;
-- Aucune règle publique : seules les fonctions du site (clé service) peuvent lire/écrire cette table.
