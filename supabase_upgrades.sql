-- AI SHAHAR 2036 — donat (Telegram Stars) orqali uy yaxshilash jadvali
create table if not exists public.upgrades (
  id         bigserial primary key,
  nickname   text not null check (nickname ~ '^[a-z0-9._]{1,30}$'),
  tier       smallint not null check (tier between 1 and 3),
  stars      integer not null,
  tg_user_id bigint,
  charge_id  text unique,
  created_at timestamptz not null default now()
);
alter table public.upgrades enable row level security;
drop policy if exists "read all" on public.upgrades;
create policy "read all" on public.upgrades for select using (true);
revoke all on public.upgrades from anon, authenticated;
grant select (nickname, tier, stars, created_at) on public.upgrades to anon, authenticated;
notify pgrst, 'reload schema';
