# WARS — Agent Instructions

**Project:** WARS (World Anime Review System)
**Stack:** Next.js 16 + TypeScript + Tailwind CSS 4 + Supabase + Stripe + Giphy
**Location:** `/home/shree/Desktop/ANIME/wars`

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest unit/integration tests
npm run test:e2e     # Playwright E2E tests
npx supabase migration up   # Apply migrations
```

### First-time setup

```bash
npm install --legacy-peer-deps
cp .env.example .env.local   # fill in Supabase / Stripe / Giphy keys
npx playwright install chromium   # no sudo; do NOT use --with-deps
npm run db:migrate                 # after `npx supabase link`
```

The app degrades gracefully with no `.env.local`: placeholder data, auth skipped, reader routes 404. Supabase-backed flows can only be verified after env + migrations + content exist.

## Architecture

- **Framework:** Next.js 16 App Router, React 19, TypeScript
- **Styling:** Tailwind CSS 4, design tokens from mockup (lime accent `#c6f277`)
- **Database:** Supabase PostgreSQL with RLS on all tables
- **Auth:** Supabase Auth (username/password)
- **Storage:** Supabase Storage (private buckets)
- **Realtime:** Supabase Realtime (chat)
- **Payments:** Stripe (subscriptions/badges)
- **GIFs:** Giphy API (free tier)
- **Tests:** Vitest + React Testing Library + Playwright

## Key Conventions

- All Supabase tables MUST have RLS enabled
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client code
- Validate all inputs with Zod on server routes
- Server-side role checks in every API route (not just UI)
- XP writes only via server-side API
- File uploads validated by MIME type, size, and extension
- Private storage buckets for all content files
- Rate limit: chat (10/30s), login (5/min), uploads (5/min)

## Roles

owner > admin > editor > moderator > reader > donator

Owner: full control, role assignment
Admin: user moderation, content oversight
Editor: manage series/chapters/assets
Moderator: moderate assigned rooms, mute users
Reader: read, progress, rate, review, chat
Donator: future entitlement (no mod powers)

## Content

Test content: Death Note manga (PDF→images), ORV light novel (EPUB)
Keep private. No public deployment without rights confirmation.

## Security Checklist

- [ ] RLS on every table
- [ ] Server-side auth check on every route
- [ ] Zod validation on all inputs
- [ ] Rate limiting on auth, chat, upload, review endpoints
- [ ] Signed URLs for private storage (with expiry)
- [ ] No secrets in git
- [ ] Service-role key server-only
- [ ] XSS sanitization on user-generated content
