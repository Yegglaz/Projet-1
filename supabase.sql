create table if not exists profils (
  id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);
alter table profils enable row level security;
create policy "lecture perso" on profils for select using (auth.uid() = id);
create policy "ecriture perso" on profils for insert with check (auth.uid() = id);
create policy "maj perso" on profils for update using (auth.uid() = id);
