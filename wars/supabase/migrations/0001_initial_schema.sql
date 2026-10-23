-- WARS Initial Schema
-- Creates all core tables for the WARS platform

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- =============================================
-- PROFILES
-- =============================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 30),
  display_name text,
  avatar_path text,
  bio text check (char_length(bio) <= 500),
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================
-- ROLES
-- =============================================
create table public.roles (
  id serial primary key,
  name text unique not null,
  description text,
  priority int not null default 0
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id int not null references public.roles(id) on delete cascade,
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

-- =============================================
-- SERIES
-- =============================================
create table public.series (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  content_type text not null check (content_type in ('manga', 'light_novel')),
  cover_path text,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_series_slug on public.series(slug);
create index idx_series_status on public.series(status);

-- =============================================
-- CHAPTERS
-- =============================================
create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series(id) on delete cascade,
  title text not null,
  slug text not null,
  chapter_number numeric not null,
  volume_number numeric,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (series_id, slug)
);

create index idx_chapters_series on public.chapters(series_id);
create index idx_chapters_order on public.chapters(series_id, chapter_number);

-- =============================================
-- CHAPTER ASSETS
-- =============================================
create table public.chapter_assets (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  asset_type text not null check (asset_type in ('page', 'file')),
  storage_path text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0),
  page_number int,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_chapter_assets_chapter on public.chapter_assets(chapter_id);
create index idx_chapter_assets_order on public.chapter_assets(chapter_id, order_index);

-- =============================================
-- READING PROGRESS
-- =============================================
create table public.reading_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  position numeric not null default 0,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, chapter_id)
);

-- =============================================
-- BOOKMARKS
-- =============================================
create table public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, series_id, chapter_id)
);

-- =============================================
-- RATINGS
-- =============================================
create table public.ratings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, series_id)
);

-- =============================================
-- REVIEWS
-- =============================================
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete set null,
  content text not null check (char_length(content) between 1 and 5000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_reviews_series on public.reviews(series_id, status);
create index idx_reviews_user on public.reviews(user_id);

create table public.review_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index idx_review_replies_review on public.review_replies(review_id);

-- =============================================
-- CHAT ROOMS
-- =============================================
create table public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  room_type text not null default 'channel' check (room_type in ('server', 'channel', 'dm')),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  parent_room_id uuid references public.chat_rooms(id) on delete cascade,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_chat_rooms_parent on public.chat_rooms(parent_room_id);
create index idx_chat_rooms_type on public.chat_rooms(room_type);

create table public.chat_room_members (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'room_admin')),
  muted_until timestamptz,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  message_type text not null default 'text' check (message_type in ('text', 'image', 'system')),
  reply_to uuid references public.chat_messages(id) on delete set null,
  is_deleted boolean not null default false,
  edited_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_chat_messages_room on public.chat_messages(room_id, created_at);

create table public.message_reactions (
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (char_length(reaction) between 1 and 8),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, reaction)
);

-- =============================================
-- MODERATION
-- =============================================
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  target_type text not null check (target_type in ('user', 'message', 'review')),
  target_id uuid not null,
  action text not null check (action in ('mute', 'unmute', 'ban', 'unban', 'delete_message', 'approve_review', 'reject_review', 'remove_review')),
  reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_moderation_actions_target on public.moderation_actions(target_type, target_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  target_type text not null check (target_type in ('message', 'review', 'user')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_reports_status on public.reports(status);

-- =============================================
-- FEEDBACK & BAN APPEALS
-- =============================================
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id),
  name text,
  content text not null check (char_length(content) between 1 and 2000),
  status text not null default 'new' check (status in ('new', 'read', 'resolved')),
  created_at timestamptz not null default now()
);

create table public.ban_appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  content text not null check (char_length(content) between 1 and 3000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- =============================================
-- XP LEDGER
-- =============================================
create table public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount int not null,
  reason text not null check (reason in ('read_chapter', 'send_message', 'review_posted', 'reaction_received')),
  source_id uuid,
  created_at timestamptz not null default now()
);

create index idx_xp_ledger_user on public.xp_ledger(user_id);
create index idx_xp_ledger_daily on public.xp_ledger(user_id, reason, created_at);

-- =============================================
-- AUDIT LOGS
-- =============================================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_actor on public.audit_logs(actor_id);
create index idx_audit_logs_action on public.audit_logs(action);

-- =============================================
-- STRIPE / PAYMENTS
-- =============================================
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'inactive' check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'inactive')),
  price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_subscriptions_user on public.subscriptions(user_id);
create index idx_subscriptions_stripe on public.subscriptions(stripe_subscription_id);

-- =============================================
-- TRIGGERS: updated_at
-- =============================================
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger update_series_updated_at before update on public.series
  for each row execute function public.update_updated_at();

create trigger update_chapters_updated_at before update on public.chapters
  for each row execute function public.update_updated_at();

create trigger update_reviews_updated_at before update on public.reviews
  for each row execute function public.update_updated_at();

create trigger update_subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.update_updated_at();

-- =============================================
-- SEED ROLES
-- =============================================
insert into public.roles (name, description, priority) values
  ('owner', 'Full control, staff role assignments, global settings', 100),
  ('admin', 'User moderation, feedback/appeal review, content oversight', 80),
  ('editor', 'Create/update/delete permitted series, chapters, and assets', 60),
  ('moderator', 'Moderate assigned rooms, mute users, submit escalation reports', 40),
  ('reader', 'Read content, maintain profile/progress, rate/review, chat', 20),
  ('donator', 'Optional future entitlement; no moderation privileges', 10);

-- =============================================
-- SEED CHAT ROOMS
-- =============================================
insert into public.chat_rooms (name, slug, room_type, visibility) values
  ('Death Note', 'death-note', 'server', 'public'),
  ('ORV', 'orv', 'server', 'public'),
  ('WARS Lounge', 'wars-lounge', 'server', 'public');

-- Add channels under each server
insert into public.chat_rooms (name, slug, room_type, visibility, parent_room_id)
select 'general', 'death-note-general', 'channel', 'public', id from public.chat_rooms where slug = 'death-note';

insert into public.chat_rooms (name, slug, room_type, visibility, parent_room_id)
select 'theories', 'death-note-theories', 'channel', 'public', id from public.chat_rooms where slug = 'death-note';

insert into public.chat_rooms (name, slug, room_type, visibility, parent_room_id)
select 'memes', 'death-note-memes', 'channel', 'public', id from public.chat_rooms where slug = 'death-note';

insert into public.chat_rooms (name, slug, room_type, visibility, parent_room_id)
select 'general', 'orv-general', 'channel', 'public', id from public.chat_rooms where slug = 'orv';

insert into public.chat_rooms (name, slug, room_type, visibility, parent_room_id)
select 'theories', 'orv-theories', 'channel', 'public', id from public.chat_rooms where slug = 'orv';

insert into public.chat_rooms (name, slug, room_type, visibility, parent_room_id)
select 'general', 'wars-lounge-general', 'channel', 'public', id from public.chat_rooms where slug = 'wars-lounge';
