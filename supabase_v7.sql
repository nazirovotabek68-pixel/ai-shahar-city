-- AI SHAHAR 2036: kunlik vazifalar, poyga, mehmonlar daftari, Telegram eslatmalari
alter table public.players add column if not exists q_day date;
alter table public.players add column if not exists q_mask integer not null default 0;
alter table public.players add column if not exists race_best real;
alter table public.players add column if not exists race_week text;
alter table public.players add column if not exists race_day date;
alter table public.players add column if not exists guest_day date;
alter table public.players add column if not exists tg_chat bigint;
alter table public.players add column if not exists tg_link text;
alter table public.players add column if not exists notify boolean not null default true;
alter table public.players add column if not exists notified_day date;
alter table public.players add column if not exists seen_likes integer not null default 0;
alter table public.players add column if not exists seen_guest bigint not null default 0;
grant select (race_best, race_week) on public.players to anon, authenticated;
create table if not exists public.guestbook (
  id bigserial primary key,
  target text not null check (target ~ '^[a-z0-9._]{1,30}$'),
  author text not null check (author ~ '^[a-z0-9._]{1,30}$'),
  text text not null check (char_length(text) between 1 and 200),
  created_at timestamptz not null default now()
);
create index if not exists guestbook_target on public.guestbook (target, id desc);
alter table public.guestbook enable row level security;
drop policy if exists "read all" on public.guestbook;
create policy "read all" on public.guestbook for select using (true);
revoke all on public.guestbook from anon, authenticated;
grant select on public.guestbook to anon, authenticated;
notify pgrst, 'reload schema';
