-- Private-message bodies are browser-local. Supabase Realtime carries them
-- only while both readers are connected; do not retain old PM bodies here.
delete from public.chat_messages m
using public.chat_rooms r
where r.id = m.room_id
  and r.room_type = 'dm';

create or replace function public.prevent_dm_message_storage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.chat_rooms r
    where r.id = new.room_id
      and r.room_type = 'dm'
  ) then
    raise exception 'Private-message history is not stored in the database';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_dm_message_storage on public.chat_messages;
create trigger prevent_dm_message_storage
  before insert on public.chat_messages
  for each row
  execute function public.prevent_dm_message_storage();

-- Private Realtime topics follow dm:<chat-room-uuid>. Only authenticated
-- members of that DM room may send to or receive from its Broadcast channel.
alter table realtime.messages enable row level security;

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
    )
  );
