# WARS — Implementation Plan

## 0. Summary

Build a private anime/manga/light-novel reading and community site using Next.js + Supabase Free. First test content: Death Note (PDF, ~200MB) and ORV (EPUB, ~20MB). ~10 users. Design follows the provided `index.html` mockup: dark theme with lime accent, Space Grotesk + DM Sans, card-based layout, Discord-style chat, episode browser, review system.

---

## 0.1 Current Status (2026-10-23)

Verification: `npm run lint` 0 errors · `npm run test` 30/30 · `npx playwright test` 10/10 · `npm run build` passes · dev server healthy on port 3000.

| Area | State | Notes |
|---|---|---|
| Phases 0–6 (setup, UI, auth, library, readers, community, XP) | Built | Code complete; live Supabase flows untested without env |
| Payments + GIF search (out-of-plan addition) | Built | Stripe checkout/webhook, Giphy proxy, GIF picker in chat |
| Admin & moderation (plan Phase 7) | Partial | `/admin/content` CRUD + uploads, review moderation, report queue API. No user management, feedback inbox, ban appeals, or audit UI |
| Polish & release (plan Phase 8) | Partial | 10 E2E smoke tests, responsive/a11y pass done. Vercel deploy not done; full user-journey E2E blocked |
| Supabase project + migrations | Blocked | `0001`–`0003` never applied; no `.env.local` exists |
| Test content (Death Note PDF, ORV EPUB) | Blocked | Source files not located; reader routes 404 until DB + assets are seeded |
| Chat extras (presence, mute, DMs) | Not built | Schema supports `dm` rooms and `moderation_actions`; no API/UI |

Known stale file: `src/lib/env.ts` is unused and references the old `NEXT_PUBLIC_GIPHY_API_KEY`. `/profile` and `/messages` are protected in `src/proxy.ts` but have no pages.

---

## 1. Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript | Matches architecture doc; good Supabase integration |
| Database | Supabase PostgreSQL Free | Auth + DB + Storage + Realtime in one free tier |
| Auth | Supabase Auth (username/password only) | No email verification needed for private test |
| Storage | Supabase Storage Free (private buckets) | Files only accessible via authorized URLs |
| Realtime chat | Supabase Realtime | Matches requirement #12 |
| Styling | Tailwind CSS + custom tokens from index.html | Extract design tokens from mockup |
| Components | shadcn/ui + custom WARS components | Accessible base components, customizable |
| Forms | Zod + React Hook Form | Client + server validation |
| Unit tests | Vitest + React Testing Library | Alongside features |
| E2E tests | Playwright | Happy paths + permission boundaries |
| PDF handling | Client-side PDF.js for reading; server-side page extraction for manga pages | Avoids storing 200MB as single file |
| EPUB handling | foliate-js or epub.js client-side | Parse and render in browser |
| Hosting | Vercel Hobby (private, no public index) | Free tier within terms |

### Storage strategy for Death Note PDF (200MB)

Supabase Free per-file limit is historically 50MB. Options:
1. **Pre-split offline** into chapter/section PDFs or WebP image pages before upload (recommended)
2. Upload to a private bucket in chunks and reassemble (complex, fragile)
3. Keep the PDF local only and serve pages via a custom API route (defeats purpose)

**Recommended approach:** Use a one-time preprocessing script to split the Death Note PDF into chapter-based WebP image sets using `pdf-lib` + `sharp` or `pdf2pic`. Upload these as individual chapter assets. The original PDF stays on your device.

For the ORV EPUB (20MB): upload as-is to a private bucket. Parse client-side with an EPUB library. No server-side conversion needed.

---

## 2. Design System (extracted from index.html)

### Colors
```
--bg:      #111116
--panel:   #1a1a21
--panel2:  #202027
--line:    #303039
--text:    #f6f3ef
--muted:   #a5a2ad
--accent:  #c6f277  (lime green)
--purple:  #b5a0ff
--pink:    #ff9eaa
--blue:    #91cbff
--gold:    #f2c96b
```

### Fonts
- Headings: Space Grotesk (400–700)
- Body: DM Sans (400–700)

### Key UI Patterns from Mockup
- Topbar: brand logo + name, notification bells, account button
- Hero section with eyebrow + large headline + streak widget
- 4-card menu grid with icon, number, art preview, hover arrow
- "Continue reading" bar with progress indicator
- Feedback form panel
- Discord-style chat: server sidebar → channel list → chat room
- Episode browser: series rail → episode list → episode detail
- Explore catalog: search + genre chips + card grid
- Review section: chapter picker + star rating + review list
- Moderation warning dialog
- Role badges (color-coded)
- Admin tools panel
- Toast notifications
- Dark background image with overlay
- Responsive: 4-col → 2-col → 1-col breakpoints at 850px and 560px

### Light Theme
- Invert key tokens; keep accent color; adjust panel/line colors for contrast
- Toggle stored in profile, persisted in localStorage

---

## 3. Data Model

### Tables

```sql
-- Profiles (extends Supabase auth.users)
profiles (
  id uuid PK references auth.users,
  username text unique not null,
  display_name text,
  avatar_path text,
  bio text,
  theme text default 'dark',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- Roles
roles (
  id serial PK,
  name text unique not null,  -- owner, admin, editor, moderator, reader, donator
  description text
)

user_roles (
  user_id uuid references profiles,
  role_id int references roles,
  assigned_by uuid references profiles,
  assigned_at timestamptz default now(),
  PK (user_id, role_id)
)

-- Series
series (
  id uuid PK default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  content_type text not null,  -- 'manga' or 'light_novel'
  cover_path text,
  status text default 'published',  -- draft, published, archived
  created_by uuid references profiles,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- Chapters
chapters (
  id uuid PK default gen_random_uuid(),
  series_id uuid references series on delete cascade,
  title text not null,
  slug text not null,
  chapter_number numeric not null,
  volume_number numeric,
  status text default 'published',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  UNIQUE (series_id, slug)
)

-- Chapter Assets (manga pages or novel file reference)
chapter_assets (
  id uuid PK default gen_random_uuid(),
  chapter_id uuid references chapters on delete cascade,
  asset_type text not null,  -- 'page' (manga image), 'file' (novel epub)
  storage_path text not null,
  mime_type text not null,
  byte_size bigint not null,
  page_number int,           -- for manga pages
  order_index int not null,
  created_at timestamptz default now()
)

-- Reading Progress
reading_progress (
  user_id uuid references profiles,
  chapter_id uuid references chapters,
  position numeric not null default 0,  -- page number or percentage
  completed boolean default false,
  updated_at timestamptz default now(),
  PK (user_id, chapter_id)
)

-- Bookmarks
bookmarks (
  user_id uuid references profiles,
  series_id uuid references series,
  chapter_id uuid references chapters,
  created_at timestamptz default now(),
  PK (user_id, series_id, chapter_id)
)

-- Ratings
ratings (
  user_id uuid references profiles,
  series_id uuid references series,
  rating int not null check (rating between 1 and 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  PK (user_id, series_id)
)

-- Reviews
reviews (
  id uuid PK default gen_random_uuid(),
  user_id uuid references profiles,
  series_id uuid references series,
  chapter_id uuid references chapters,
  content text not null,
  status text default 'pending',  -- pending, approved, rejected, removed
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- Review Replies
review_replies (
  id uuid PK default gen_random_uuid(),
  review_id uuid references reviews on delete cascade,
  user_id uuid references profiles,
  content text not null,
  created_at timestamptz default now()
)

-- Chat Rooms
chat_rooms (
  id uuid PK default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  room_type text not null,  -- 'server', 'channel', 'dm'
  visibility text default 'public',  -- public, private
  parent_room_id uuid references chat_rooms,
  created_by uuid references profiles,
  created_at timestamptz default now()
)

-- Chat Room Members
chat_room_members (
  room_id uuid references chat_rooms,
  user_id uuid references profiles,
  role text default 'member',  -- member, room_admin
  muted_until timestamptz,
  joined_at timestamptz default now(),
  PK (room_id, user_id)
)

-- Chat Messages
chat_messages (
  id uuid PK default gen_random_uuid(),
  room_id uuid references chat_rooms,
  sender_id uuid references profiles,
  content text not null,
  message_type text default 'text',  -- text, image, system
  reply_to uuid references chat_messages,
  is_deleted boolean default false,
  edited_at timestamptz,
  created_at timestamptz default now()
)

-- Message Reactions
message_reactions (
  message_id uuid references chat_messages on delete cascade,
  user_id uuid references profiles,
  reaction text not null,  -- unicode emoji
  created_at timestamptz default now(),
  PK (message_id, user_id, reaction)
)

-- Moderation Actions
moderation_actions (
  id uuid PK default gen_random_uuid(),
  actor_id uuid references profiles,
  target_type text not null,  -- 'user', 'message', 'review'
  target_id uuid not null,
  action text not null,  -- mute, ban, delete_message, approve_review, reject_review
  reason text,
  expires_at timestamptz,
  created_at timestamptz default now()
)

-- Reports
reports (
  id uuid PK default gen_random_uuid(),
  reporter_id uuid references profiles,
  target_type text not null,  -- 'message', 'review', 'user'
  target_id uuid not null,
  reason text not null,
  status text default 'open',  -- open, reviewed, resolved
  reviewed_by uuid references profiles,
  created_at timestamptz default now()
)

-- Feedback
feedback (
  id uuid PK default gen_random_uuid(),
  sender_id uuid references profiles,
  name text,
  content text not null,
  status text default 'new',  -- new, read, resolved
  created_at timestamptz default now()
)

-- Ban Appeals
ban_appeals (
  id uuid PK default gen_random_uuid(),
  user_id uuid references profiles,
  content text not null,
  status text default 'pending',  -- pending, approved, rejected
  reviewed_by uuid references profiles,
  created_at timestamptz default now(),
  reviewed_at timestamptz
)

-- XP Ledger
xp_ledger (
  id uuid PK default gen_random_uuid(),
  user_id uuid references profiles,
  amount int not null,
  reason text not null,  -- read_chapter, send_message, review_posted
  source_id uuid,        -- chapter_id, message_id, review_id
  created_at timestamptz default now()
)

-- Audit Logs
audit_logs (
  id uuid PK default gen_random_uuid(),
  actor_id uuid references profiles,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
)
```

### RLS Policies (summary)

| Table | Anonymous | Reader | Editor | Moderator | Admin | Owner |
|---|---|---|---|---|---|---|
| profiles | read public fields | read all, update own | + | + | + | + |
| series | read published | read published | CRUD own | read | CRUD | CRUD |
| chapters | read published | read published | CRUD in series | read | CRUD | CRUD |
| chapter_assets | none (private bucket) | via signed URL | CRUD | read | CRUD | CRUD |
| reading_progress | none | CRUD own | CRUD own | CRUD own | + all | + all |
| bookmarks | none | CRUD own | CRUD own | CRUD own | + all | + all |
| ratings | read approved | CRUD own | CRUD own | CRUD own | + all | + all |
| reviews | read approved | create + update own | CRUD own | approve/reject | + all | + all |
| chat_messages | none | send in member rooms | send | mute/delete | + all | + all |
| chat_rooms | read public | read public | read | read | CRUD | CRUD |
| xp_ledger | none | read own | read own | read own | + all | + all |
| moderation_actions | none | none | none | create (own scope) | + all | + all |
| reports | none | create | create | create + review | + all | + all |
| feedback | create | create | create | read | + all | + all |
| ban_appeals | create | create own | read | read | + all | + all |
| audit_logs | none | none | none | none | read | CRUD |
| user_roles | none | read own | read own | read own | manage | + assign owner |

---

## 4. XP System

### Formula (MVP)
```
XP sources:
  - Read a chapter to completion:  10 XP
  - Send a chat message:           1 XP  (max 50/day)
  - Post a review (approved):      15 XP
  - Receive a reaction on message:  2 XP  (capped at 20/day)

Level formula:
  XP required for level N = N * 100
  Level 1 = 0 XP, Level 2 = 100 XP, ..., Level 100 = 9900 XP

Ranks:
  1–9    Rookie
  10–19  Regular
  20–29  Veteran
  30–39  Elite
  40–49  Master
  50–59  Grandmaster
  60–69  Legend
  70–79  Mythic
  80–89  Immortal
  90–99  Transcendent
  100    Anime Deity
```

### Anti-abuse
- No XP while muted or suspended
- Chat XP has daily cap
- XP writes only via server-side API (never client-direct)
- All XP changes recorded in `xp_ledger`
- Chapter completion requires minimum dwell time (e.g., 30 seconds) before XP triggers

---

## 5. Chat Architecture

### Room Structure
```
Servers (top-level rooms):
  ├── Death Note
  │   ├── general
  │   ├── theories
  │   └── memes
  ├── ORV
  │   ├── general
  │   └── theories
  └── WARS Lounge
      └── general
```

### Implementation
- Supabase Realtime channel per room
- Messages stored in `chat_messages` table
- Realtime subscription for INSERT/UPDATE on messages
- Presence tracking via Supabase Realtime presence
- Rate limit: 10 messages per 30 seconds per user
- Unicode emoji only (no custom images in MVP)
- Reply-to-message supported
- Reactions via `message_reactions`
- Moderator mute: sets `muted_until` on `chat_room_members`
- Report message: creates `reports` row

### DMs
- DM rooms: `room_type = 'dm'`, two members
- Same message/reaction infrastructure
- Only visible to the two participants (RLS)

---

## 6. Reader Architecture

### Manga Reader (Death Note PDF → image pages)

**Preprocessing (offline, one-time):**
```bash
# Script: scripts/split-pdf.mjs
# Input: death-note.pdf
# Output: public/preprocessed/death-note/ch01/page-001.webp, ...
# Uses: pdf2pic or pdf-poppler + sharp for WebP conversion
# Splits by chapter boundaries (manual or auto-detect by page count)
```

**Online reading:**
- Pages stored in Supabase Storage private bucket
- Signed URLs generated server-side per page
- Two view modes:
  - **Vertical scroll:** all pages loaded as `<img>` in a column (lazy load)
  - **Horizontal flip:** single page with prev/next buttons + keyboard arrows
- Progress saved to `reading_progress` on page change (debounced)

### Light Novel Reader (EPUB)

- EPUB file stored in Supabase Storage (20MB, under limit)
- Downloaded to browser, parsed client-side with foliate-js or epub.js
- Features:
  - Chapter navigation (TOC from EPUB)
  - Font size control (small/medium/large/xl)
  - Dark/light reading mode (independent of site theme)
  - Progress tracking by CFI (EPUB canonical fragment identifier)
  - Scroll or paginated reading mode

---

## 7. Project Structure

```
wars/
├── CLAUDE.md
├── README.md
├── WARS_ARCHITECTURE.md
├── WARS_PLAN.md
├── .env.example
├── .gitignore
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── public/
│   ├── icons/
│   ├── placeholder-covers/
│   └── wars-background.jpg
├── docs/
│   ├── decisions/
│   └── operations/
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 0001_initial_schema.sql
│   │   ├── 0002_rls_policies.sql
│   │   ├── 0003_chat_tables.sql
│   │   └── 0004_xp_and_moderation.sql
│   ├── seed.sql
│   └── tests/
├── scripts/
│   ├── split-pdf.mjs
│   └── seed-roles.mjs
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx              # Home (hero + cards + continue reading)
│   │   │   ├── library/
│   │   │   │   └── page.tsx          # Browse all series
│   │   │   └── series/[slug]/
│   │   │       └── page.tsx          # Series detail + chapter list
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (reader)/
│   │   │   ├── read/[seriesSlug]/[chapterSlug]/
│   │   │   │   └── page.tsx          # Manga/LN reader
│   │   │   └── profile/[username]/
│   │   │       └── page.tsx          # User profile + XP + reviews
│   │   ├── (community)/
│   │   │   ├── chat/
│   │   │   │   └── page.tsx          # Chat with server/channel sidebar
│   │   │   └── messages/page.tsx     # DMs
│   │   ├── dashboard/
│   │   │   └── page.tsx              # User dashboard
│   │   ├── admin/
│   │   │   ├── page.tsx              # Admin overview
│   │   │   ├── content/page.tsx      # Upload/manage series + chapters
│   │   │   ├── users/page.tsx        # User management + roles
│   │   │   ├── moderation/page.tsx   # Reports, reviews, appeals
│   │   │   └── feedback/page.tsx     # Feedback inbox
│   │   └── api/
│   │       ├── auth/
│   │       │   └── callback/route.ts
│   │       ├── chapters/
│   │       │   └── [id]/assets/route.ts  # Signed URLs for chapter assets
│   │       ├── progress/route.ts
│   │       ├── xp/route.ts
│   │       ├── chat/
│   │       │   ├── messages/route.ts
│   │       │   └── rooms/route.ts
│   │       ├── reviews/route.ts
│   │       ├── feedback/route.ts
│   │       ├── reports/route.ts
│   │       ├── moderation/
│   │       │   ├── mute/route.ts
│   │       │   └── ban/route.ts
│   │       └── admin/
│   │           ├── roles/route.ts
│   │           ├── upload/route.ts
│   │           └── appeals/route.ts
│   ├── components/
│   │   ├── ui/                       # shadcn/ui base components
│   │   ├── layout/
│   │   │   ├── TopBar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── Toast.tsx
│   │   ├── home/
│   │   │   ├── HeroSection.tsx
│   │   │   ├── MenuCards.tsx
│   │   │   ├── ContinueReading.tsx
│   │   │   └── FeedbackPanel.tsx
│   │   ├── library/
│   │   │   ├── SeriesCard.tsx
│   │   │   ├── ChapterList.tsx
│   │   │   └── ExploreGrid.tsx
│   │   ├── reader/
│   │   │   ├── MangaReader.tsx
│   │   │   ├── NovelReader.tsx
│   │   │   ├── ReaderControls.tsx
│   │   │   └── ProgressTracker.tsx
│   │   ├── reviews/
│   │   │   ├── ReviewForm.tsx
│   │   │   ├── ReviewList.tsx
│   │   │   ├── StarRating.tsx
│   │   │   └── ReviewReplies.tsx
│   │   ├── chat/
│   │   │   ├── ChatLayout.tsx
│   │   │   ├── ServerSidebar.tsx
│   │   │   ├── ChannelList.tsx
│   │   │   ├── ChatRoom.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   ├── Reactions.tsx
│   │   │   └── PresenceIndicator.tsx
│   │   ├── moderation/
│   │   │   ├── ReportDialog.tsx
│   │   │   ├── ModerationWarning.tsx
│   │   │   └── RoleBadge.tsx
│   │   └── admin/
│   │       ├── UploadPanel.tsx
│   │       ├── UserTable.tsx
│   │       ├── ModerationQueue.tsx
│   │       └── FeedbackInbox.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── useAuth.ts
│   │   ├── permissions/
│   │   │   ├── guards.ts
│   │   │   └── usePermissions.ts
│   │   ├── library/
│   │   │   └── useSeries.ts
│   │   ├── reader/
│   │   │   ├── useMangaReader.ts
│   │   │   └── useNovelReader.ts
│   │   ├── reviews/
│   │   │   └── useReviews.ts
│   │   ├── chat/
│   │   │   ├── useChat.ts
│   │   │   └── useChatSubscription.ts
│   │   ├── moderation/
│   │   │   └── useModeration.ts
│   │   └── progression/
│   │       ├── useXP.ts
│   │       └── rank.ts
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser client
│   │   │   ├── server.ts             # Server client
│   │   │   ├── middleware.ts         # Session refresh
│   │   │   └── admin.ts              # Service-role client (server only)
│   │   ├── env.ts                    # Environment variable validation
│   │   ├── validation/
│   │   │   ├── auth.ts
│   │   │   ├── series.ts
│   │   │   ├── chat.ts
│   │   │   ├── reviews.ts
│   │   │   └── feedback.ts
│   │   ├── security/
│   │   │   ├── rate-limit.ts
│   │   │   ├── sanitize.ts
│   │   │   └── file-validation.ts
│   │   ├── xp/
│   │   │   └── calculate.ts
│   │   └── utils.ts
│   ├── types/
│   │   ├── database.ts               # Generated Supabase types
│   │   ├── series.ts
│   │   ├── chat.ts
│   │   └── user.ts
│   └── middleware.ts
├── tests/
│   ├── unit/
│   │   ├── xp.test.ts
│   │   ├── permissions.test.ts
│   │   ├── sanitize.test.ts
│   │   └── file-validation.test.ts
│   ├── integration/
│   │   ├── auth.test.ts
│   │   ├── series.test.ts
│   │   ├── reviews.test.ts
│   │   └── chat.test.ts
│   └── e2e/
│       ├── auth.spec.ts
│       ├── reading.spec.ts
│       ├── chat.spec.ts
│       ├── reviews.spec.ts
│       └── permissions.spec.ts
```

---

## 8. Development Phases

### Phase 0 — Setup (no UI)
1. Initialize Next.js project with TypeScript, Tailwind
2. Install dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `react-hook-form`, `@hookform/resolvers`, `lucide-react`, `pdfjs-dist`, `foliate-js` (or epub.js)
3. Set up shadcn/ui
4. Create `.env.example` with all required variables
5. Set up `.gitignore`
6. Create CLAUDE.md
7. Initialize Supabase project, run initial migration
8. Seed roles table
9. Create private storage buckets (covers, chapter-assets, avatars)
10. Write Vitest config and first unit test

**Acceptance:**
- `npm run dev` starts without errors
- `npm run test` passes
- Supabase connection verified
- Migration applied successfully

### Phase 1 — UI Shell
1. Extract design tokens from index.html into Tailwind config
2. Build TopBar (brand, notifications placeholder, account button)
3. Build ThemeToggle (dark/light)
4. Build Home page: Hero, MenuCards, ContinueReading placeholder, FeedbackPanel
5. Build Library page with placeholder series cards
6. Build Series detail page with placeholder chapter list
7. Responsive: verify at 375px, 768px, 1280px

**Acceptance:**
- Home page matches mockup visually
- Both themes work
- All breakpoints responsive
- No console errors

### Phase 2 — Auth & Permissions
1. Supabase Auth setup: register, login, logout, session management
2. Profile creation on register (username, display name)
3. Middleware for route protection
4. Server-side role checking utilities
5. RLS policies for profiles and user_roles
6. Login/Register forms with Zod validation
7. Protected route wrappers
8. Tests: register → login → logout flow; Reader cannot access admin routes

**Acceptance:**
- User can register with username/password
- User can login/logout
- Profile auto-created
- Middleware redirects unauthenticated users
- Role checks enforced server-side (not just UI)

### Phase 3 — Content Library
1. Admin content management page
2. Series CRUD (create/edit/delete)
3. Chapter CRUD within series
4. Upload cover images
5. Upload chapter assets:
   - Manga: upload processed page images
   - Novel: upload EPUB file
6. File validation: MIME type, size limits, extension whitelist
7. Private bucket access via signed URLs
8. Seed Death Note and ORV metadata
9. Upload sample chapters (2-3 per series)
10. Tests: upload validation, signed URL generation, private access

**Acceptance:**
- Admin can create series and chapters
- Files upload to private bucket
- Signed URLs expire correctly
- Anonymous users cannot access private files
- Chapter ordering works

### Phase 4 — Readers
1. Manga reader:
   - Vertical scroll mode with lazy loading
   - Horizontal page-flip mode with keyboard nav
   - Page counter and chapter navigation
   - Progress saving (debounced)
2. Novel reader (EPUB):
   - EPUB download and client-side parsing
   - TOC/chapter navigation
   - Font size controls
   - Dark/light reading mode toggle
   - Progress tracking by CFI
3. Continue reading widget on home page
4. Bookmark toggle on series/chapter
5. Tests: reader rendering, progress save/load, bookmark CRUD

**Acceptance:**
- Manga pages load and display correctly
- Both reading modes work
- EPUB renders with chapter navigation
- Progress persists across sessions
- Works on mobile

### Phase 5 — Community
1. Ratings:
   - Star rating on series (1-5)
   - Average rating display
   - One rating per user per series
2. Reviews:
   - Create review with chapter association
   - Moderated before appearing (status = pending)
   - Admin/moderator approval queue
   - Review replies
   - Report review
3. Chat:
   - Chat layout: server sidebar + channel list + chat room
   - Real-time message delivery via Supabase Realtime
   - Unicode emoji in messages
   - Reply to message
   - Reactions on messages
   - Presence indicator (online users)
   - Rate limiting (10 msg / 30 sec)
   - DM support
4. Moderation:
   - Mute user in room
   - Delete message
   - Report message/user
   - Moderation warning dialog
5. Tests: review moderation flow, chat rate limit, mute enforcement, permission boundaries

**Acceptance:**
- Ratings and reviews work
- Reviews require moderation before public
- Chat messages deliver in real-time
- Reactions and replies work
- Muted users cannot send messages
- Rate limits enforced

### Phase 6 — Progression
1. XP calculation library
2. Server-side XP endpoints:
   - Chapter completion → 10 XP (with dwell time check)
   - Chat message → 1 XP (daily cap)
   - Approved review → 15 XP
   - Reaction received → 2 XP (daily cap)
3. XP ledger writes
4. Level and rank calculation
5. Profile rank display
6. Anti-abuse: no XP while muted, daily caps, dwell time
7. Tests: XP calculation, daily caps, mute blocks XP, ledger integrity

**Acceptance:**
- XP earned for reading, chatting, reviewing
- Level and rank display correctly on profile
- Anti-abuse rules enforced
- All XP changes in ledger

### Phase 7 — Admin & Moderation
1. Admin dashboard overview
2. User management: list users, assign roles, ban/unban
3. Feedback inbox: view, mark read, respond
4. Ban appeal review: approve/reject
5. Moderation queue: pending reviews, open reports
6. Audit logging for admin actions
7. Owner-only: role assignment, global settings
8. Tests: role assignment permissions, ban flow, appeal flow

**Acceptance:**
- Admin can manage users and roles
- Feedback and appeals viewable
- Moderation queue processes items
- Audit logs recorded
- Owner privileges enforced

### Phase 8 — Polish & Release
1. Landing page refinement
2. Accessibility pass (WCAG 2.1 AA): keyboard nav, ARIA labels, focus management, color contrast
3. Full responsive QA
4. Security review:
   - No secrets in code
   - RLS on all tables
   - Server-side validation on all inputs
   - Rate limiting on all endpoints
   - Signed URL expiry
   - XSS prevention (sanitize chat/review content)
5. Playwright E2E: full user journey (register → browse → read → rate → review → chat)
6. Performance: lazy loading, image optimization, bundle analysis
7. Deploy to Vercel (private, no public index)
8. Final quota check

**Acceptance:**
- All tests pass (unit + integration + E2E)
- No security vulnerabilities
- Accessible and responsive
- Deployed and accessible to test users only
- No paid services activated

---

## 9. Environment Variables

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # server only, never expose
```

---

## 10. Dependencies

### Core
```
next, react, react-dom
@supabase/supabase-js
@supabase/ssr
typescript
tailwindcss
zod
react-hook-form
@hookform/resolvers
lucide-react
```

### Readers
```
pdfjs-dist          # PDF rendering (if needed client-side)
foliate-js          # EPUB rendering
# OR epub.js as alternative
```

### UI
```
class-variance-authority
clsx
tailwind-merge
@radix-ui/react-*   # via shadcn/ui
```

### Testing
```
vitest
@testing-library/react
@testing-library/jest-dom
@playwright/test
jsdom
```

### Dev
```
eslint
prettier
@types/node, @types/react, @types/react-dom
```

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Supabase Free pauses after 7 days inactivity | Site goes down | Periodic activity script or accept downtime |
| 200MB PDF exceeds per-file storage limit | Cannot upload as single file | Pre-split into chapter image sets |
| 1GB total storage quota exceeded | Cannot store all content | Start with 2-3 chapters per series; keep originals local |
| 2GB egress/month exceeded | Slow or blocked access for readers | Image optimization (WebP), lazy loading, limited concurrent users |
| Supabase Free 2 concurrent connections | Chat breaks with multiple users | Acceptable for ~10 users; monitor |
| Realtime connections limited | Presence/chat degrades | Graceful degradation; poll as fallback |
| EPUB parsing edge cases | Reader breaks on some files | Test with actual ORV file early; have fallback to raw text |
| Copyright enforcement action | Account terminated | Private deployment only; no public access; accept risk (user confirmed) |

---

## 12. What We Are NOT Building (MVP)

Scope update 2026-10-23: payments and GIF search were added and are now built.

Still out of scope:
- Voice/video chat
- Advanced recommendations
- Public deployment / SEO
- Domain purchase
- Multi-storage-provider support
- Content beyond Death Note and ORV
- Chat presence, user mute, and direct messages (schema only)
