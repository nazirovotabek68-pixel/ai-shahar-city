-- AI SHAHAR 2036: "Uyim = biznes kartochkam" va kasblar katalogi
alter table public.players add column if not exists card_title text;
alter table public.players add column if not exists card_cat text;
alter table public.players add column if not exists card_bio text;
alter table public.players add column if not exists card_link text;
alter table public.players add column if not exists card_at timestamptz;
grant select (card_title, card_cat, card_bio, card_link) on public.players to anon, authenticated;
notify pgrst, 'reload schema';
