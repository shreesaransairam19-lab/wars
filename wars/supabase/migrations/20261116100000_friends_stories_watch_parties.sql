create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_requests_no_self check (requester_id <> addressee_id),
  constraint friend_requests_pair_unique unique (requester_id, addressee_id)
);

create index if not exists friend_requests_incoming_pending
  on public.friend_requests (addressee_id, created_at desc) where status = 'pending';
create index if not exists friend_requests_outgoing_pending
  on public.friend_requests (requester_id, created_at desc) where status = 'pending';
create index if not exists friend_requests_accepted_by_requester
  on public.friend_requests (requester_id, addressee_id) where status = 'accepted';
create index if not exists friend_requests_accepted_by_addressee
  on public.friend_requests (addressee_id, requester_id) where status = 'accepted';
create unique index if not exists friend_requests_one_active_pair
  on public.friend_requests (least(requester_id, addressee_id), greatest(requester_id, addressee_id))
  where status in ('pending', 'accepted');

create table if not exists public.user_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text,
  mime_type text,
  caption varchar(300) not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  constraint user_stories_has_content check (storage_path is not null or length(trim(caption)) > 0),
  constraint user_stories_media_pair check ((storage_path is null) = (mime_type is null))
);
create index if not exists user_stories_expiring on public.user_stories (expires_at);
create index if not exists user_stories_user_active on public.user_stories (user_id, created_at desc);

create table if not exists public.watch_parties (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists watch_parties_active on public.watch_parties (created_at desc) where closed_at is null;

create table if not exists public.watch_party_members (
  party_id uuid not null references public.watch_parties(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'declined')),
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (party_id, user_id)
);
create index if not exists watch_party_members_user_status on public.watch_party_members (user_id, status);

alter table public.friend_requests enable row level security;
alter table public.user_stories enable row level security;
alter table public.watch_parties enable row level security;
alter table public.watch_party_members enable row level security;
revoke all on public.friend_requests, public.user_stories, public.watch_parties, public.watch_party_members from public, anon, authenticated;
grant all on public.friend_requests, public.user_stories, public.watch_parties, public.watch_party_members to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-stories', 'user-stories', false, 26214400,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.is_watch_party_member(p_topic text, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null
    and pg_catalog.split_part(p_topic, ':', 1) = 'watch-party'
    and exists (
      select 1 from public.watch_party_members member
      join public.watch_parties party on party.id = member.party_id
      where party.id::text = pg_catalog.split_part(p_topic, ':', 2)
        and party.closed_at is null
        and member.user_id = p_user_id
        and member.status = 'accepted'
    )
    and not exists (
      select 1 from public.user_bans ban
      where ban.user_id = p_user_id
        and (ban.expires_at is null or ban.expires_at > pg_catalog.now())
    );
$$;

revoke all on function public.is_watch_party_member(text, uuid) from public, anon;
grant execute on function public.is_watch_party_member(text, uuid) to authenticated;

drop policy if exists "Watch party members can receive realtime" on realtime.messages;
create policy "Watch party members can receive realtime"
  on realtime.messages for select to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and public.is_watch_party_member(realtime.topic(), auth.uid())
  );

drop policy if exists "Watch party members can send realtime" on realtime.messages;
create policy "Watch party members can send realtime"
  on realtime.messages for insert to authenticated
  with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and public.is_watch_party_member(realtime.topic(), auth.uid())
  );
