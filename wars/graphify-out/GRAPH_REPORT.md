# Graph Report - wars  (2026-10-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 542 nodes · 833 edges · 60 communities (32 shown, 28 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- createClient
- dependencies
- 0001_initial_schema.sql
- WARS (World Anime Review System)
- devDependencies
- actions.ts
- ReaderPage.tsx
- compilerOptions
- database.ts
- Next.js project (create-next-app)
- app/page.tsx
- file-validation.ts
- chat/page.tsx
- content/page.tsx
- calculate.ts
- useAuth
- ReviewSection.tsx
- TopBar.tsx
- utils.ts
- library/page.tsx
- feedback.ts
- [slug]/page.tsx
- AdminContentPage
- layout.tsx
- ThemeToggle.tsx
- env.ts
- proxy.ts
- eslint.config.mjs
- next.config.ts
- public.audit_logs
- public.ban_appeals
- public.bookmarks
- public.chapter_assets
- public.chapters
- public.chat_messages
- public.chat_room_members
- public.chat_rooms
- public.feedback
- public.message_reactions
- public.moderation_actions
- public.profiles
- public.ratings
- public.reading_progress
- public.reports
- public.review_replies
- public.reviews
- public.roles
- public.series
- public.user_roles
- public.xp_ledger
- public.subscriptions
- public.subscriptions

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 61 edges
2. `public.profiles` - 21 edges
3. `hasRole()` - 16 edges
4. `checkRateLimit()` - 16 edges
5. `getClientIp()` - 16 edges
6. `compilerOptions` - 16 edges
7. `WARS (World Anime Review System)` - 12 edges
8. `useAuth()` - 11 edges
9. `createAdminClient()` - 11 edges
10. `TopBar()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `WARS (World Anime Review System)` --references--> `typescript`  [EXTRACTED]
  CLAUDE.md → package.json
- `stripe` --conceptually_related_to--> `Donator role`  [INFERRED]
  package.json → CLAUDE.md
- `Next.js project (create-next-app)` --conceptually_related_to--> `Next.js App Router`  [INFERRED]
  README.md → CLAUDE.md
- `WARS Architecture` --references--> `stripe`  [EXTRACTED]
  CLAUDE.md → package.json
- `WARS (World Anime Review System)` --references--> `stripe`  [EXTRACTED]
  CLAUDE.md → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **WARS platform technology stack** — claude_next_js_16, claude_tailwind_css_4, claude_supabase, claude_giphy [EXTRACTED 1.00]
- **WARS role hierarchy members** — claude_role_owner, claude_role_admin, claude_role_editor, claude_role_moderator, claude_role_reader, claude_role_donator [EXTRACTED 1.00]
- **WARS security controls** — claude_rls, claude_service_role_key, claude_zod_validation, claude_server_side_role_checks, claude_rate_limiting, claude_signed_urls, claude_xss_sanitization [EXTRACTED 1.00]

## Communities (60 total, 28 thin omitted)

### Community 0 - "createClient"
Cohesion: 0.06
Nodes (61): bookmarkSchema, DELETE(), GET(), POST(), GET(), DELETE(), GET(), PATCH() (+53 more)

### Community 1 - "dependencies"
Cohesion: 0.05
Nodes (40): class-variance-authority, clsx, @hookform/resolvers, lucide-react, next, dependencies, class-variance-authority, clsx (+32 more)

### Community 2 - "0001_initial_schema.sql"
Cohesion: 0.12
Nodes (33): auth, auth.users, public, public.handle_new_user, public.update_updated_at, on_auth_user_created, public.audit_logs, public.ban_appeals (+25 more)

### Community 3 - "WARS (World Anime Review System)"
Cohesion: 0.09
Nodes (34): Next.js App Router, WARS Architecture, WARS Commands, Design tokens (lime accent #c6f277), File upload validation (MIME, size, extension), Giphy API, WARS Key Conventions, Private storage buckets for content (+26 more)

### Community 4 - "devDependencies"
Cohesion: 0.06
Nodes (34): eslint, eslint-config-next, jsdom, devDependencies, eslint, eslint-config-next, jsdom, @playwright/test (+26 more)

### Community 5 - "actions.ts"
Cohesion: 0.10
Nodes (21): POST(), POST(), metadata, metadata, AuthActionResult, getProfile(), getProfileRoles(), getUser() (+13 more)

### Community 6 - "ReaderPage.tsx"
Cohesion: 0.07
Nodes (20): ChapterReader(), Params, MangaReader(), MangaReaderProps, ReaderAsset, ViewMode, findTocByHref(), FONT_SIZES (+12 more)

### Community 7 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 8 - "database.ts"
Cohesion: 0.10
Nodes (19): BanAppeal, Chapter, ChapterAsset, ChatMessage, ChatRoom, Database, Feedback, Json (+11 more)

### Community 9 - "Next.js project (create-next-app)"
Cohesion: 0.13
Nodes (17): Breaking changes vs. training data, generate-agent-files.js, next dev agent-file regeneration, Bundled Next.js guides (node_modules/next/dist/docs/), Next.js Agent Rules block, Next.js 16, app/page.tsx, create-next-app (+9 more)

### Community 10 - "app/page.tsx"
Cohesion: 0.17
Nodes (8): ContinueReading(), ProgressRow, FeedbackPanel(), TODO: Wire to /api/feedback in Phase 7, HeroSection(), cards, colorMap, MenuCards()

### Community 11 - "file-validation.ts"
Cohesion: 0.18
Nodes (13): UploadPanel(), UploadPanelProps, ALLOWED_IMAGE_EXTENSIONS, ALLOWED_IMAGE_TYPES, ALLOWED_NOVEL_EXTENSIONS, ALLOWED_NOVEL_TYPES, FileValidationResult, MAX_COVER_SIZE (+5 more)

### Community 12 - "chat/page.tsx"
Cohesion: 0.16
Nodes (5): ChatContent(), ChatView(), Gif, Message, Room

### Community 13 - "content/page.tsx"
Cohesion: 0.21
Nodes (10): Chapter, Series, ChapterForm(), autoSlug(), handleSubmit(), ChapterFormProps, SeriesForm(), autoSlug() (+2 more)

### Community 14 - "calculate.ts"
Cohesion: 0.36
Nodes (9): GET(), calculateLevel(), getLevelProgress(), getRank(), getXpForLevel(), getXpForNextLevel(), MAX_LEVEL, RANKS (+1 more)

### Community 15 - "useAuth"
Cohesion: 0.29
Nodes (7): DashboardPage(), Stats, Profile, useAuth(), UseAuthReturn, createClient(), isSupabaseConfigured()

### Community 16 - "ReviewSection.tsx"
Cohesion: 0.22
Nodes (3): Review, ReviewSection(), StarRating()

### Community 17 - "TopBar.tsx"
Cohesion: 0.28
Nodes (4): SupportPage(), navLinks, TopBar(), UserMenu()

### Community 18 - "utils.ts"
Cohesion: 0.31
Nodes (5): Toast(), ToastProps, cn(), formatDate(), formatRelativeTime()

### Community 19 - "library/page.tsx"
Cohesion: 0.33
Nodes (4): LibrarySeries, loadSeries(), placeholderSeries, SeriesGrid()

### Community 20 - "feedback.ts"
Cohesion: 0.29
Nodes (6): BanAppealInput, banAppealSchema, FeedbackInput, feedbackSchema, ReportInput, reportSchema

### Community 21 - "[slug]/page.tsx"
Cohesion: 0.33
Nodes (3): placeholder, SeriesContent(), SeriesView

### Community 23 - "layout.tsx"
Cohesion: 0.40
Nodes (3): dmSans, metadata, spaceGrotesk

### Community 24 - "ThemeToggle.tsx"
Cohesion: 0.70
Nodes (4): getServerSnapshot(), getSnapshot(), subscribe(), ThemeToggle()

## Knowledge Gaps
- **175 isolated node(s):** `RoleName`, `RateLimitEntry`, `ChatMessageInput`, `ReactionInput`, `RatingInput` (+170 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `createClient` to `actions.ts`, `ReaderPage.tsx`, `app/page.tsx`, `chat/page.tsx`, `calculate.ts`, `library/page.tsx`, `[slug]/page.tsx`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `dependencies`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `WARS (World Anime Review System)` connect `WARS (World Anime Review System)` to `Next.js project (create-next-app)`, `devDependencies`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `RoleName`, `RateLimitEntry`, `ChatMessageInput` to the rest of the system?**
  _175 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `createClient` be split into smaller, more focused modules?**
  _Cohesion score 0.06080246913580247 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `0001_initial_schema.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.11746031746031746 - nodes in this community are weakly interconnected._