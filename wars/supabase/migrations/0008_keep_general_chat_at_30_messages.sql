-- Keep the permanent #general channel small to reduce chat-history storage.
-- Reactions cascade with deleted messages; replies from newer messages are
-- retained with reply_to set to null by the foreign key.
with ranked_messages as (
  select
    m.id,
    row_number() over (
      partition by m.room_id
      order by m.created_at desc, m.id desc
    ) as position
  from public.chat_messages m
  join public.chat_rooms r on r.id = m.room_id
  where r.slug = 'general-chat-general'
)
delete from public.chat_messages m
using ranked_messages old_message
where m.id = old_message.id
  and old_message.position > 30;

create or replace function public.prune_general_chat_history()
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
      and r.slug = 'general-chat-general'
  ) then
    -- Serialize concurrent posts to this room so the limit remains enforced.
    perform pg_advisory_xact_lock(hashtextextended(new.room_id::text, 0));

    delete from public.chat_messages m
    where m.room_id = new.room_id
      and m.id not in (
        select latest.id
        from public.chat_messages latest
        where latest.room_id = new.room_id
        order by latest.created_at desc, latest.id desc
        limit 30
      );
  end if;

  return new;
end;
$$;

drop trigger if exists keep_general_chat_history_small on public.chat_messages;
create trigger keep_general_chat_history_small
  after insert on public.chat_messages
  for each row
  execute function public.prune_general_chat_history();
