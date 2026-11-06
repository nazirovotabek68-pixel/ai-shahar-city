-- AI SHAHAR 2036: daromad — kristall paketlari, katta ekranga xabar, biznes reklama
create table if not exists public.purchases (
  id bigserial primary key, kind text not null, nick text, stars integer not null, amount integer,
  tg_user_id bigint, charge_id text unique, created_at timestamptz not null default now()
);
alter table public.purchases enable row level security;
revoke all on public.purchases from anon, authenticated;
create table if not exists public.shouts (
  id bigserial primary key, nick text not null check (nick ~ '^[a-z0-9._]{1,30}$'),
  text text not null check (char_length(text) between 1 and 90),
  paid boolean not null default false, start_at timestamptz, end_at timestamptz, created_at timestamptz not null default now()
);
alter table public.shouts enable row level security;
drop policy if exists "read paid" on public.shouts;
create policy "read paid" on public.shouts for select using (paid);
revoke all on public.shouts from anon, authenticated;
grant select (id, nick, text, start_at, end_at) on public.shouts to anon, authenticated;
create table if not exists public.ads (
  id bigserial primary key, title text not null, text text, link text, until date not null, created_at timestamptz not null default now()
);
alter table public.ads enable row level security;
drop policy if exists "read active" on public.ads;
create policy "read active" on public.ads for select using (until >= current_date);
revoke all on public.ads from anon, authenticated;
grant select on public.ads to anon, authenticated;
notify pgrst, 'reload schema';
