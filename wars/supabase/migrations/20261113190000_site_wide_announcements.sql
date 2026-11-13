create table public.site_announcements (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('update', 'maintenance')),
  title text not null check (char_length(title) between 1 and 100),
  message text not null check (char_length(message) between 1 and 1500),
  scheduled_for timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (kind = 'maintenance' or scheduled_for is null)
);

create index site_announcements_created_at_idx
  on public.site_announcements (created_at desc);

create table public.site_announcement_reads (
  announcement_id uuid not null references public.site_announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

alter table public.site_announcements enable row level security;
alter table public.site_announcement_reads enable row level security;

revoke all on public.site_announcements from anon, authenticated;
revoke all on public.site_announcement_reads from anon, authenticated;
grant all on public.site_announcements to service_role;
grant all on public.site_announcement_reads to service_role;
