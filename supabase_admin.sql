-- AI SHAHAR 2036: robotni tiklash kodi, chat bloklash, tashrif statistikasi
alter table public.players add column if not exists recovery text;
create table if not exists public.chat_bans (nick text primary key, created_at timestamptz not null default now());
alter table public.chat_bans enable row level security;
revoke all on public.chat_bans from anon, authenticated;
create table if not exists public.visits (
  day date not null, uid text not null, ref text, mobile boolean,
  created_at timestamptz not null default now(), primary key (day, uid)
);
alter table public.visits enable row level security;
revoke all on public.visits from anon, authenticated;
create or replace view public.visits_daily as
  select day, count(*)::int as uniques, count(*) filter (where mobile)::int as mobile from public.visits group by day;
create or replace view public.visits_refs as
  select coalesce(ref, 'direct') as ref, count(*)::int as visits from public.visits where day > current_date - 7 group by 1;
revoke all on public.visits_daily, public.visits_refs from anon, authenticated;
notify pgrst, 'reload schema';
