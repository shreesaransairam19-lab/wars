alter table public.series drop constraint if exists series_content_type_check;
alter table public.series
  add constraint series_content_type_check
  check (content_type in ('manga', 'light_novel', 'anime', 'anime_movie'));
