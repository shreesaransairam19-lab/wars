# WARS — World Anime Review System

WARS is a community platform with separate manga/light-novel and anime libraries, reviews, and live chat. Built with Next.js 16, React 19, Tailwind 4, and Supabase.

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
| `npm run db:migrate` | Push pending SQL migrations to the linked Supabase project |
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

The migrations create the required private storage buckets and policies. They also define the separate manga and anime content types. Apply pending migrations before adding anime titles or enabling profile frame purchases and selection. The profile frame store is added by migration `0013_profile_frame_store.sql`.

## Tests

```bash
npm run test                                  # 30 unit tests
npx playwright install chromium               # no sudo required
npm run test:e2e                              # 10 smoke tests
```

`--with-deps` needs sudo and is not used here.

## Deploy

Vercel Hobby. Set every variable from `.env.example` in the project settings, point the Stripe webhook at `/api/stripe/webhook`, and apply pending migrations to the production Supabase project.

## Status

Current build/verification status and remaining blockers are tracked at the top of `../WARS_PLAN.md` (section 0.1).
