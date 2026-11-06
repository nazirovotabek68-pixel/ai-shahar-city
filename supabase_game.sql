-- AI SHAHAR 2036: o'yin (kristallar, seriya, do'kon) va uylarga like
create table if not exists public.players (
  nick text primary key check (nick ~ '^[a-z0-9._]{1,30}$'),
  uid text not null,
  crystals integer not null default 0,
  total integer not null default 0,
  streak integer not null default 0,
  best_streak integer not null default 0,
  last_day date,
  col_day date,
  col_mask integer not null default 0,
  last_collect timestamptz,
  items text[] not null default '{}',
  equipped jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.players enable row level security;
drop policy if exists "read all" on public.players;
create policy "read all" on public.players for select using (true);
revoke all on public.players from anon, authenticated;
grant select (nick, crystals, total, streak, best_streak, equipped) on public.players to anon, authenticated;
create table if not exists public.house_likes (
  uid text not null,
  target text not null check (target ~ '^[a-z0-9._]{1,30}$'),
  week text not null,
  created_at timestamptz not null default now(),
  primary key (uid, target, week)
);
alter table public.house_likes enable row level security;
revoke all on public.house_likes from anon, authenticated;
create or replace view public.house_likes_week as
  select target, week, count(*)::int as likes from public.house_likes group by target, week;
revoke all on public.house_likes_week from anon, authenticated;
grant select on public.house_likes_week to anon, authenticated;
notify pgrst, 'reload schema';
