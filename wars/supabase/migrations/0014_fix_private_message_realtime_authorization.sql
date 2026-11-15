-- Private Realtime authorization must be able to check memberships in private
-- chat rooms. This narrowly scoped SECURITY DEFINER helper bypasses the normal
-- chat_rooms RLS read rules while returning only a membership/ban decision.
create or replace function public.is_active_dm_realtime_member(
  p_topic text,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null
    and pg_catalog.split_part(p_topic, ':', 1) = 'dm'
    and exists (
      select 1
      from public.chat_rooms as room
      join public.chat_room_members as member on member.room_id = room.id
      where room.id::text = pg_catalog.split_part(p_topic, ':', 2)
        and room.room_type = 'dm'
        and member.user_id = p_user_id
    )
    and not exists (
      select 1
      from public.user_bans as ban
      where ban.user_id = p_user_id
        and (ban.expires_at is null or ban.expires_at > pg_catalog.now())
    );
$$;

create or replace function public.can_send_dm_realtime_broadcast(
  p_topic text,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null
    and pg_catalog.split_part(p_topic, ':', 1) = 'dm'
    and exists (
      select 1
      from public.chat_rooms as room
      join public.chat_room_members as member on member.room_id = room.id
      where room.id::text = pg_catalog.split_part(p_topic, ':', 2)
        and room.room_type = 'dm'
        and member.user_id = p_user_id
        and (member.muted_until is null or member.muted_until <= pg_catalog.now())
    )
    and not exists (
      select 1
      from public.user_bans as ban
      where ban.user_id = p_user_id
        and (ban.expires_at is null or ban.expires_at > pg_catalog.now())
    );
$$;

revoke all on function public.is_active_dm_realtime_member(text, uuid) from public, anon;
revoke all on function public.can_send_dm_realtime_broadcast(text, uuid) from public, anon;
grant execute on function public.is_active_dm_realtime_member(text, uuid) to authenticated;
grant execute on function public.can_send_dm_realtime_broadcast(text, uuid) to authenticated;

drop policy if exists "DM members can receive private broadcasts" on realtime.messages;
create policy "DM members can receive private broadcasts"
  on realtime.messages for select to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and public.is_active_dm_realtime_member(realtime.topic(), auth.uid())
  );

drop policy if exists "DM members can send private broadcasts" on realtime.messages;
create policy "DM members can send private broadcasts"
  on realtime.messages for insert to authenticated
  with check (
    (
      realtime.messages.extension = 'presence'
      and public.is_active_dm_realtime_member(realtime.topic(), auth.uid())
    )
    or (
      realtime.messages.extension = 'broadcast'
      and public.can_send_dm_realtime_broadcast(realtime.topic(), auth.uid())
    )
  );
