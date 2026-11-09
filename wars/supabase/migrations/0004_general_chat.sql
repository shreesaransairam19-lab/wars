-- Ensure every WARS deployment has a permanent public General chat.
insert into public.chat_rooms (name, slug, room_type, visibility)
values ('General', 'general-chat', 'server', 'public')
on conflict (slug) do nothing;

insert into public.chat_rooms (name, slug, room_type, visibility, parent_room_id)
select 'general', 'general-chat-general', 'channel', 'public', id
from public.chat_rooms
where slug = 'general-chat' and room_type = 'server'
on conflict (slug) do nothing;
