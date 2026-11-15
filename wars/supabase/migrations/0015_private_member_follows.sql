create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint user_follows_no_self_follow check (follower_id <> followed_id)
);

create index if not exists idx_user_follows_followed_id
  on public.user_follows(followed_id);

alter table public.user_follows enable row level security;
revoke all on public.user_follows from public, anon, authenticated;
grant all on public.user_follows to service_role;
