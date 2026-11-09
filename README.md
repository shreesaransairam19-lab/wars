# WARS — World Anime Review System

WARS is a community site with separate manga/light-novel and anime libraries, reviews, and live chat. It uses Next.js 16, React 19, Tailwind 4, Supabase, and optional Stripe/Giphy integrations.

---

## Repository layout

| Path | What it is |
|---|---|
| `wars/` | The Next.js application |
| `WARS_PLAN.md` | Full implementation plan, data model, RLS, XP rules, current status (§0.1) |
| `founder/` | Product/business analysis notes (not part of the app) |

App-specific docs: [`wars/README.md`](wars/README.md) and [`wars/CLAUDE.md`](wars/CLAUDE.md).

---

## Run locally

```bash
cd wars
npm install --legacy-peer-deps      # required by the pinned peer graph
cp .env.example .env.local          # optional for UI-only; required for real data
npm run dev                         # http://localhost:3000
```

The app degrades gracefully without `.env.local`: Supabase pages show placeholders, auth is skipped, and reader routes return 404 until content exists.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests (30) |
| `npm run test:e2e` | Playwright E2E (10 smoke tests) |
| `npm run db:migrate` | Push pending migrations to the linked Supabase project |
| `npm run db:seed` | `supabase db seed` |

### Tests

```bash
cd wars
npm run lint
npm run test
npx playwright install chromium   # no sudo; do NOT use --with-deps
npm run test:e2e
```

---

## Environment variables

Copy `wars/.env.example` to `wars/.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe (optional for reading/community)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=

# Giphy (server-side only)
GIPHY_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Never commit `.env.local` or the service-role key.

---

## Supabase setup (one time)

1. Create a project at https://supabase.com/dashboard (save the DB password).
2. **Authentication → Providers → Email** → disable **Confirm email** (auth uses synthetic `username@wars.local` addresses).
3. Fill the three Supabase values in `wars/.env.local`.
4. Link and migrate:
   ```bash
   cd wars
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npm run db:migrate
   ```
5. The migrations create the private storage buckets: `covers`, `chapter-assets`, `avatars`.
6. Register your account, then grant it the `owner` role (no automatic bootstrap):
   ```sql
   insert into public.user_roles (user_id, role_id)
   select p.id, r.id from public.profiles p, public.roles r
   where p.username = '<your-username>' and r.name = 'owner';
   ```

Migrations include the separate manga and anime content types. Apply all pending files in `wars/supabase/migrations/` before adding anime titles.

---

## Deploy

The project can run on the free tiers of Vercel, Render, and Supabase. Supabase is the single shared Postgres/Auth/Storage service; do not create a separate Render database because the app would not synchronize two independent databases.

### Render free web service

This repository includes a root-level `render.yaml` Blueprint. In Render, create a new Blueprint from this GitHub repository and select the free plan. The service root is `wars/`; Render uses `npm ci --legacy-peer-deps --include=dev && npm run build` and `npm start`. The free service filesystem is temporary, so reader uploads must be stored in the configured Supabase Storage buckets (`covers`, `chapter-assets`, `avatars`), not on local disk. Free Render services can spin down when idle and may take a little longer to wake.

When Render asks for environment values, use the Supabase project URL, anon key, and service-role key. Keep the service-role key private. Once Render assigns its URL, enter it as `NEXT_PUBLIC_APP_URL` in Render. Stripe keys and Giphy are optional and may be left blank.

### Vercel

Connect this same GitHub repository to Vercel and set the project root directory to `wars/`. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in Vercel's environment settings. Set `NEXT_PUBLIC_APP_URL` to the Vercel URL. Configure Supabase Auth's Site URL and redirect allow-list with both the Vercel and Render URLs so either host can sign users in. Both hosts use the same Supabase accounts, content, and chat; sign-in cookies are per hostname.

### Supabase setup

Use a Supabase Free project. Disable email confirmation under **Authentication → Providers → Email** because WARS uses username sign-in with synthetic addresses. Apply the SQL files in `wars/supabase/migrations/` in order using the Supabase SQL Editor, then create the private storage buckets listed above. Supabase Free has limited storage and may pause inactive projects; it is suitable for initial testing, not an uptime guarantee.

Vercel Hobby, Render Free, and Supabase Free have usage limits. No paid service is configured. Stripe integrations remain disabled unless you add Stripe keys.

---

## Current status

The latest code is pushed to the primary and Vercel-connected repositories. The production database migration and current deployment status still need confirmation in Supabase and Vercel. See `WARS_PLAN.md` §0.1 for the full status table.
