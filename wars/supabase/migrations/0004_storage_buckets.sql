-- Private buckets for WARS media. The EPUB upload flow uses signed upload
-- tokens so large files go from the browser directly to Storage, not Vercel.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('covers', 'covers', false, 5242880, array['image/jpeg','image/png','image/webp','image/gif']),
  ('chapter-assets', 'chapter-assets', false, 52428800, array['image/jpeg','image/png','image/webp','image/gif','application/epub+zip']),
  ('avatars', 'avatars', false, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "WARS authenticated media read" on storage.objects;
create policy "WARS authenticated media read"
  on storage.objects for select to authenticated
  using (bucket_id in ('covers', 'chapter-assets', 'avatars'));

drop policy if exists "WARS editors manage media" on storage.objects;
create policy "WARS editors manage media"
  on storage.objects for all to authenticated
  using (
    bucket_id in ('covers', 'chapter-assets', 'avatars')
    and exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin', 'editor')
    )
  )
  with check (
    bucket_id in ('covers', 'chapter-assets', 'avatars')
    and exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin', 'editor')
    )
  );
