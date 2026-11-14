-- AI SHAHAR 2036 v10: aeroport o'yinlari (yo'lak poygasi + uchuvchi)
alter table public.players add column if not exists sprint_best real;
alter table public.players add column if not exists sprint_week text;
alter table public.players add column if not exists pilot_best real;
alter table public.players add column if not exists pilot_week text;
alter table public.players add column if not exists pilot_day date;
grant select (sprint_best, sprint_week, pilot_best, pilot_week) on public.players to anon, authenticated;
