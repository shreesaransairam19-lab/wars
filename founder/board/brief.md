# Board brief — WARS (round 2, revised audience)

## What it is

An anime/manga/light-novel reading and community website. Not a commercial business yet: no revenue, no pricing. **Revised 2026-10-20: the audience is ~1000 anime readers, not ~10 friends.** The original plan document (WARS_PLAN.md) was written for a private ~10-user test on 100% free tiers; the founder has now stated the app is for 1000 users. Acquisition channel for those 1000 users is not yet specified.

## Who it is for

~1000 anime/manga/light-novel readers. Previously the brief said "founder plus ~10 friends, invite-only." Whether the site is still invite-only at 1000 users, and how those 1000 people arrive, is an open question the founder has not answered.

## The product

- **Reading:** Manga reader (Death Note PDF, ~200MB, pre-processed offline into per-chapter WebP image sets because per-file caps forced it) and light-novel reader (ORV EPUB, parsed client-side). Vertical-scroll and page-flip modes, progress saving, bookmarks.
- **Community:** Discord-style chat (servers → channels → rooms) with realtime messages, reactions, replies, DMs, presence.
- **Social:** 1–5 star ratings, moderated reviews, replies.
- **Progression:** XP/levels/ranks for reading, chatting, approved reviews.
- **Roles & moderation:** owner → admin → editor → moderator → reader; mute, ban, ban appeals, reports, audit logs. (These matter more at 1000 users than at 10.)
- **Design:** Dark theme with lime accent, card-based UI, light-theme toggle.

## Tech and delivery (as planned vs. as required)

- Planned in WARS_PLAN.md: Next.js 15 + TypeScript + Tailwind + shadcn/ui, **Supabase Free**, **Vercel Hobby**, $0, en-forced caps: 1GB storage, ~50MB/file, ~2 concurrent realtime connections, 2GB egress/month, 7-day inactivity pause.
- **Required at 1000 users:** those free-tier caps cannot serve 1000 readers and a busy chat. Paid infrastructure (Supabase Pro or equivalent, or self-hosted VPS) is required; monthly cost is an open question for /founder-cfo. Nobody has priced this.
- Solo founder, ~12-week phased build in the plan document.

## The goal

Original goal: "works reliably for ~10 users, pleasant reading, fun chat, nothing public, free-tier limits intact." **That goal is now obsolete.** The unstated new goal: work reliably for ~1000 users. What "nothing public" means at 1000 users, and whether the founder accepts real recurring cost, are open.
