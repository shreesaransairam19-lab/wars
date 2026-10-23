-- WARS Row Level Security Policies
-- Enable RLS on all tables and create explicit policies

-- =============================================
-- PROFILES
-- =============================================
alter table public.profiles enable row level security;

-- Anyone can read profiles
create policy "Profiles: public read"
  on public.profiles for select
  using (true);

-- Users can update their own profile
create policy "Profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Profile creation handled by trigger (security definer)

-- =============================================
-- ROLES
-- =============================================
alter table public.roles enable row level security;

create policy "Roles: public read"
  on public.roles for select
  using (true);

-- =============================================
-- USER_ROLES
-- =============================================
alter table public.user_roles enable row level security;

-- Users can read their own roles
create policy "User roles: read own"
  on public.user_roles for select
  using (auth.uid() = user_id);

-- Staff can read all roles
create policy "User roles: staff read all"
  on public.user_roles for select
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin')
    )
  );

-- Only owner and admin can assign roles
create policy "User roles: owner/admin assign"
  on public.user_roles for insert
  with check (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin')
    )
  );

-- Only owner can assign owner role (handled in app-level check)
-- Only owner and admin can remove roles
create policy "User roles: owner/admin delete"
  on public.user_roles for delete
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin')
    )
  );

-- =============================================
-- SERIES
-- =============================================
alter table public.series enable row level security;

-- Anyone can read published series
create policy "Series: public read published"
  on public.series for select
  using (status = 'published');

-- Staff can read all series
create policy "Series: staff read all"
  on public.series for select
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin', 'editor', 'moderator')
    )
  );

-- Editor and above can create series
create policy "Series: editor create"
  on public.series for insert
  with check (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin', 'editor')
    )
  );

-- Editor and above can update series
create policy "Series: editor update"
  on public.series for update
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin', 'editor')
    )
  );

-- Admin and above can delete series
create policy "Series: admin delete"
  on public.series for delete
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin')
    )
  );

-- =============================================
-- CHAPTERS
-- =============================================
alter table public.chapters enable row level security;

create policy "Chapters: public read published"
  on public.chapters for select
  using (
    status = 'published'
    and exists (
      select 1 from public.series s
      where s.id = series_id and s.status = 'published'
    )
  );

create policy "Chapters: staff read all"
  on public.chapters for select
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin', 'editor', 'moderator')
    )
  );

create policy "Chapters: editor create"
  on public.chapters for insert
  with check (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin', 'editor')
    )
  );

create policy "Chapters: editor update"
  on public.chapters for update
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin', 'editor')
    )
  );

create policy "Chapters: admin delete"
  on public.chapters for delete
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin')
    )
  );

-- =============================================
-- CHAPTER_ASSETS
-- =============================================
alter table public.chapter_assets enable row level security;

create policy "Chapter assets: authenticated read"
  on public.chapter_assets for select
  using (auth.uid() is not null);

create policy "Chapter assets: editor manage"
  on public.chapter_assets for all
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin', 'editor')
    )
  );

-- =============================================
-- READING_PROGRESS
-- =============================================
alter table public.reading_progress enable row level security;

create policy "Reading progress: own CRUD"
  on public.reading_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Staff can read all progress
create policy "Reading progress: staff read all"
  on public.reading_progress for select
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin')
    )
  );

-- =============================================
-- BOOKMARKS
-- =============================================
alter table public.bookmarks enable row level security;

create policy "Bookmarks: own CRUD"
  on public.bookmarks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================
-- RATINGS
-- =============================================
alter table public.ratings enable row level security;

create policy "Ratings: public read"
  on public.ratings for select
  using (true);

create policy "Ratings: own CRUD"
  on public.ratings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================
-- REVIEWS
-- =============================================
alter table public.reviews enable row level security;

create policy "Reviews: public read approved"
  on public.reviews for select
  using (status = 'approved');

create policy "Reviews: authenticated read own pending"
  on public.reviews for select
  using (auth.uid() = user_id);

create policy "Reviews: staff read all"
  on public.reviews for select
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin', 'moderator')
    )
  );

create policy "Reviews: authenticated create"
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "Reviews: owner update own"
  on public.reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Reviews: staff moderate"
  on public.reviews for update
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin', 'moderator')
    )
  );

create policy "Reviews: owner delete"
  on public.reviews for delete
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin')
    )
  );

-- =============================================
-- REVIEW_REPLIES
-- =============================================
alter table public.review_replies enable row level security;

create policy "Review replies: public read"
  on public.review_replies for select
  using (true);

create policy "Review replies: authenticated create"
  on public.review_replies for insert
  with check (auth.uid() = user_id);

create policy "Review replies: owner delete"
  on public.review_replies for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin')
    )
  );

-- =============================================
-- CHAT_ROOMS
-- =============================================
alter table public.chat_rooms enable row level security;

create policy "Chat rooms: public read"
  on public.chat_rooms for select
  using (visibility = 'public');

create policy "Chat rooms: staff read all"
  on public.chat_rooms for select
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin', 'moderator')
    )
  );

create policy "Chat rooms: admin manage"
  on public.chat_rooms for all
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin')
    )
  );

-- =============================================
-- CHAT_ROOM_MEMBERS
-- =============================================
alter table public.chat_room_members enable row level security;

create policy "Chat room members: read membership"
  on public.chat_room_members for select
  using (true);

create policy "Chat room members: join rooms"
  on public.chat_room_members for insert
  with check (auth.uid() = user_id);

create policy "Chat room members: leave rooms"
  on public.chat_room_members for delete
  using (auth.uid() = user_id);

create policy "Chat room members: staff manage"
  on public.chat_room_members for update
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin', 'moderator')
    )
  );

-- =============================================
-- CHAT_MESSAGES
-- =============================================
alter table public.chat_messages enable row level security;

create policy "Chat messages: read in accessible rooms"
  on public.chat_messages for select
  using (
    room_id in (
      select id from public.chat_rooms where visibility = 'public'
      union
      select room_id from public.chat_room_members where user_id = auth.uid()
    )
  );

create policy "Chat messages: authenticated create"
  on public.chat_messages for insert
  with check (
    auth.uid() = sender_id
    and not exists (
      select 1 from public.chat_room_members crm
      where crm.room_id = chat_messages.room_id
      and crm.user_id = auth.uid()
      and crm.muted_until > now()
    )
  );

create policy "Chat messages: sender edit"
  on public.chat_messages for update
  using (auth.uid() = sender_id);

create policy "Chat messages: staff delete"
  on public.chat_messages for update
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin', 'moderator')
    )
  );

-- =============================================
-- MESSAGE_REACTIONS
-- =============================================
alter table public.message_reactions enable row level security;

create policy "Message reactions: read"
  on public.message_reactions for select
  using (true);

create policy "Message reactions: own add/remove"
  on public.message_reactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================
-- MODERATION_ACTIONS
-- =============================================
alter table public.moderation_actions enable row level security;

create policy "Moderation actions: staff read"
  on public.moderation_actions for select
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin', 'moderator')
    )
  );

create policy "Moderation actions: staff create"
  on public.moderation_actions for insert
  with check (auth.uid() = actor_id);

-- =============================================
-- REPORTS
-- =============================================
alter table public.reports enable row level security;

create policy "Reports: authenticated create"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "Reports: staff read"
  on public.reports for select
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin', 'moderator')
    )
  );

create policy "Reports: staff update"
  on public.reports for update
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin', 'moderator')
    )
  );

-- =============================================
-- FEEDBACK
-- =============================================
alter table public.feedback enable row level security;

create policy "Feedback: anyone create"
  on public.feedback for insert
  with check (true);

create policy "Feedback: staff read"
  on public.feedback for select
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin')
    )
  );

create policy "Feedback: staff update"
  on public.feedback for update
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin')
    )
  );

-- =============================================
-- BAN_APPEALS
-- =============================================
alter table public.ban_appeals enable row level security;

create policy "Ban appeals: authenticated create"
  on public.ban_appeals for insert
  with check (auth.uid() = user_id);

create policy "Ban appeals: own read"
  on public.ban_appeals for select
  using (auth.uid() = user_id);

create policy "Ban appeals: staff read"
  on public.ban_appeals for select
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin')
    )
  );

create policy "Ban appeals: staff update"
  on public.ban_appeals for update
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin')
    )
  );

-- =============================================
-- XP_LEDGER
-- =============================================
alter table public.xp_ledger enable row level security;

create policy "XP ledger: own read"
  on public.xp_ledger for select
  using (auth.uid() = user_id);

create policy "XP ledger: staff read all"
  on public.xp_ledger for select
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin')
    )
  );

-- XP writes only via service role (server-side), no client insert policy

-- =============================================
-- AUDIT_LOGS
-- =============================================
alter table public.audit_logs enable row level security;

create policy "Audit logs: staff read"
  on public.audit_logs for select
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin')
    )
  );

-- Audit logs written only via service role

-- =============================================
-- SUBSCRIPTIONS
-- =============================================
alter table public.subscriptions enable row level security;

create policy "Subscriptions: own read"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Subscriptions: staff read all"
  on public.subscriptions for select
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
      and r.name in ('owner', 'admin')
    )
  );

-- Subscriptions managed via Stripe webhooks + service role
