# Product lens (round 2 — 1000 users)
Score: 4 | Vote: FUND IF

## What is strong
- **Clear core experience.** The reading flow (manga/light novel, vertical/page-flip, progress saving) is coherent as a product experience. The vertical-scroll/page-flip modes show attention to how people actually read.
- **Dark UI with craft.** Card-based UI, lime accent, light/dark toggle suggests taste in design details.
- **Thoughtful for the reading use case.** Pre-processing PDFs into WebP, client-side EPUB parsing shows care for delivery/performance constraints of the medium.

## What would kill it (the top 3, most dangerous first)
1. **Trust/moderation at scale (highest).** At ~10 friends, moderation is trivial. At ~1000 cold strangers, chat, DMs, reviews, reports, bans/appeals, audit logs go from "nice-to-have" to load-bearing. The brief lists roles/moderation (owner→reader, mute/ban/appeals/reports/audit logs) but does not say these exist or are hardened; seams in moderation/trust are the first place this breaks at 1000 users.
2. **Infrastructure caps vs scale (second).** Supabase Free + Vercel Hobby were sized for ~10 users with en-forced caps (1GB storage, ~50MB/file, ~2 concurrent realtime connections, 2GB egress/month, 7-day inactivity pause). At 1000 users this is impossible as stated; paid infrastructure is required with no stated cost. The experience (especially realtime chat at scale) cannot be delivered as planned without changing the whole stack.
3. **Acquisition/onboarding fit (third).** The plan was "invite-only for ~10". Now it's ~1000 users with acquisition channel unstated. At 1000 cold users, onboarding is no longer "send a link" — discoverability, first-time experience, and expectations shift. Without a stated acquisition path, it's unclear if the product experience is even being built for the right arrival flow.

## The questions I would ask the founder
- **Experience:** What is the *one thing* this must do brilliantly for a cold anime reader arriving for the first time (not an invited friend)? Describe their first five minutes end-to-end.
- **Trust:** Are moderation/reporting/appeal flows actually implemented and tested for abuse at scale, or are they only listed as features? Who handles reports at 1000 users (solo founder)?
- **Scale/cost:** What is the estimated monthly cost for 1000 users (Supabase Pro/equivalent + Vercel/hosting + bandwidth)? Has the founder accepted recurring cost, or is there still an assumption of free tiers?
- **Acquisition:** How will ~1000 users actually arrive? Is it still invite-only, or public? If public, what prevents link-sharing/abuse?
- **Scope:** Given scale change invalidates the 8-phase plan sized for 10 users, what gets cut to keep the *one thing* great?

## If FUND IF: the conditions
- **Prove the one thing.** Pick *either* reading *or* community as the single thing to do brilliantly for 1000 cold users, cut the rest to a minimal viable slice, and show that slice working well (not the full feature set).
- **Solve trust before scale.** Implement and test basic moderation/reporting/appeals for the public/cold arrival case (or explicitly keep invite-only with a concrete invite mechanism) before opening to 1000 users.
- **Get cost reality.** Get a concrete infrastructure cost estimate from /founder-cfo (paid plan requirements) and confirm the founder accepts recurring spend; do not rely on Supabase Free/Vercel Hobby at 1000 users.
- **Define acquisition.** State acquisition channel and whether it's invite-only/public, with a plan that matches the onboarding reality for strangers (not friends).
- **Validate copyright posture.** At community scale with copyrighted manga/LN content, confirm legal/compliance stance (open question for /founder-legal if needed) — the Product lens flags this as a seam in the whole experience that could break trust/compliance.
