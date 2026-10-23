# WARS — World Anime Review System

Private manga / light-novel reader and community for ~10 users. Next.js 16 (App Router, Turbopack), Supabase Free (Auth/Postgres/Storage/Realtime), Stripe, Giphy, Tailwind 4.

Test content: Death Note (manga) and Omniscient Reader's Viewpoint (light novel).

## Quick start

```bash
npm install --legacy-peer-deps      # required by the pinned peer graph
cp .env.example .env.local          # fill in the keys (see below)
npm run dev                         # http://localhost:3000
```

The app runs without `.env.local`: Supabase-backed pages fall back to placeholders, auth is skipped, and the reader routes return 404 until real content exists.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server on :3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright E2E (needs dev server or starts one) |
| `npm run db:migrate` | `supabase migration up` |
| `npm run db:seed` | `supabase db seed` |

## Environment

Copy `.env.example` to `.env.local` and fill it:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`
- `GIPHY_API_KEY` (server-side only)
- `NEXT_PUBLIC_APP_URL` (default `http://localhost:3000`)

Never commit `.env.local` or the service-role key.

## Database

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npm run db:migrate
```

Then create the private storage buckets: `covers`, `chapter-assets`, `avatars`.

Migrations live in `supabase/migrations/` (`0001` schema + seed, `0002` RLS, `0003` Stripe uniqueness). They have not been applied to a live project yet.

## Test content

- Death Note: split the source PDF into WebP chapter pages with `node scripts/split-pdf.mjs`, then upload through `/admin/content`.
- ORV: upload the EPUB as-is to the `chapter-assets` bucket through `/admin/content`.

The source PDF/EPUB are not in this repo.

## Tests

```bash
npm run test                                  # 30 unit tests
npx playwright install chromium               # no sudo required
npm run test:e2e                              # 10 smoke tests
```

`--with-deps` needs sudo and is not used here.

## Deploy

Vercel Hobby. Set every variable from `.env.example` in the project settings, point the Stripe webhook at `/api/stripe/webhook`, and re-run the migrations against the production Supabase project.

## Status

Current build/verification status and remaining blockers are tracked at the top of `../WARS_PLAN.md` (section 0.1).
