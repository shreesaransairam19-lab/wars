-- Persistent chat bans, separate from the Supabase Auth account so members can
-- still sign in and submit an appeal.
create table if not exists public.user_bans (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  banned_by uuid references public.profiles(id),
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists idx_user_bans_expires_at on public.user_bans(expires_at);

-- Automatic moderation entries have no human staff actor.
alter table public.moderation_actions alter column actor_id drop not null;

-- Chat writes must pass through the WARS API, which performs profanity and
-- moderation checks before forwarding them with the service role.
drop policy if exists "Chat messages: authenticated create" on public.chat_messages;

alter table public.user_bans enable row level security;

drop policy if exists "Users can view their own chat ban" on public.user_bans;
create policy "Users can view their own chat ban"
  on public.user_bans for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Moderators can view chat bans" on public.user_bans;
create policy "Moderators can view chat bans"
  on public.user_bans for select to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and r.name in ('owner', 'admin', 'moderator')
    )
  );

-- A banned member loses access to an already-open DM relay channel as well as
-- being blocked by the WARS chat API. The ban can therefore revoke broadcasts
-- without deleting their private-conversation memberships.
drop policy if exists "DM members can receive private broadcasts" on realtime.messages;
create policy "DM members can receive private broadcasts"
  on realtime.messages for select to authenticated
  using (
    split_part(realtime.topic(), ':', 1) = 'dm'
    and exists (
      select 1
      from public.chat_rooms r
      join public.chat_room_members member on member.room_id = r.id
      where r.id::text = split_part(realtime.topic(), ':', 2)
        and r.room_type = 'dm'
        and member.user_id = auth.uid()
        and not exists (
          select 1 from public.user_bans ban
          where ban.user_id = auth.uid()
            and (ban.expires_at is null or ban.expires_at > now())
        )
    )
  );

drop policy if exists "DM members can send private broadcasts" on realtime.messages;
create policy "DM members can send private broadcasts"
  on realtime.messages for insert to authenticated
  with check (
    split_part(realtime.topic(), ':', 1) = 'dm'
    and exists (
      select 1
      from public.chat_rooms r
      join public.chat_room_members member on member.room_id = r.id
      where r.id::text = split_part(realtime.topic(), ':', 2)
        and r.room_type = 'dm'
        and member.user_id = auth.uid()
        and (member.muted_until is null or member.muted_until <= now())
        and not exists (
          select 1 from public.user_bans ban
          where ban.user_id = auth.uid()
            and (ban.expires_at is null or ban.expires_at > now())
        )
    )
  );
