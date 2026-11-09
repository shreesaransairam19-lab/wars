-- Chapter writing and chapter media management belong to Owner and Editor.
drop policy if exists "Chapters: editor create" on public.chapters;
create policy "Chapters: owner/editor create"
  on public.chapters for insert
  with check (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'editor')
    )
  );

drop policy if exists "Chapters: editor update" on public.chapters;
create policy "Chapters: owner/editor update"
  on public.chapters for update
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'editor')
    )
  );

drop policy if exists "Chapters: admin delete" on public.chapters;
create policy "Chapters: owner/editor delete"
  on public.chapters for delete
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'editor')
    )
  );

drop policy if exists "Chapter assets: editor manage" on public.chapter_assets;
create policy "Chapter assets: owner/editor manage"
  on public.chapter_assets for all
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'editor')
    )
  );

drop policy if exists "WARS editors manage media" on storage.objects;
create policy "WARS editors manage media"
  on storage.objects for all to authenticated
  using (
    bucket_id in ('covers', 'chapter-assets', 'avatars')
    and exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'editor')
    )
  )
  with check (
    bucket_id in ('covers', 'chapter-assets', 'avatars')
    and exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'editor')
    )
  );
