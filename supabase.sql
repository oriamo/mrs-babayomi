-- Run once in Supabase → SQL Editor.
-- Visitors can read and add tributes, but never edit or delete them.
-- To remove a message, delete its row in Supabase → Table Editor.
create table tributes (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 80),
  relation text check (char_length(relation) <= 80),
  message text not null check (char_length(message) between 1 and 3000),
  created_at timestamptz not null default now()
);

alter table tributes enable row level security;

create policy "anyone can read" on tributes for select using (true);
create policy "anyone can add" on tributes for insert with check (true);
