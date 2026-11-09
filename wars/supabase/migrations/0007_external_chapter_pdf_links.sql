alter table public.chapter_assets
  add column if not exists external_url text;

alter table public.chapter_assets
  alter column byte_size drop not null;

alter table public.chapter_assets
  drop constraint if exists chapter_assets_external_url_https;

alter table public.chapter_assets
  add constraint chapter_assets_external_url_https
  check (external_url is null or external_url ~ '^https://[^[:space:]]+$');
