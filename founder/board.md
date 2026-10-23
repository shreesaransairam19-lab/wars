# The board — WARS

**Vote: 3 FUND IF, 0 PASS. Average score: 5.3/10** (Offers 6, Monopoly 6, Product 4)

The board is aligned that the project is fundable *as pitched* — a private, free site for ~10 friends — but none of the three will fund it as currently scoped and specified. As a commercial business it would be a PASS; every member scored it against the founder's stated goal instead.

## Risks more than one member raised

1. **Free-tier capacity vs. the "works reliably for ~10 users" goal.** All three named this first or near-first. ~2 concurrent realtime connections against ~10 chatters, 1GB storage holding a pre-processed ~200MB Death Note, 2GB egress/month serving WebP pages, 50MB per-file cap, and a 7-day inactivity pause that can kill the site during a quiet week. This can break in week one and it breaks the core promise, not a side feature.
2. **Scope with no cut list.** Reading (2 formats × 2 modes + progress + bookmarks) + full Discord-clone chat (servers, channels, DMs, presence, reactions, replies) + moderated reviews + XP/ranks + 5-tier roles with ban appeals and audit logs. The plan cuts nothing. For a solo 12-week build this is the most likely single cause of failure — the Product member called it "six products in one brief."
3. **Copyright and platform exposure.** Hosting Death Note/ORV even privately is infringement held at bay only by "nothing leaks publicly" — an intention, not a mechanism. One shared link or public storage URL → DMCA → Vercel/Supabase suspension → site gone. No member trusts the current mitigation (signed URLs are planned but unproven).
4. **The chat has to earn its place against Discord.** All three asked some version of: the friend group already has free, excellent chat — what does WARS say in the first five minutes that makes them move? Nobody in the brief has the answer.

## Conditions (merged checklist)

The rest of the founder pack should tick these off:

- [ ] **Capacity proof before feature build** — spike-test ~10 concurrent realtime users and the real Death Note asset set against actual Supabase Free caps; write the degradation plan for each cap. (`/founder-cfo`)
- [ ] **Cut scope to a v1 slice** — reading experience + one thin chat surface (a room or two, messages + presence) ship first. XP/ranks, DMs, ban appeals, audit logs, moderated reviews are later phases *or never*. Re-cut the 8-phase plan to match.
- [ ] **Privacy as an engineered control** — auth-gated routes and signed, expiring storage URLs before any content uploads; no public indexing; a written takedown/rotation plan ready before launch.
- [ ] **A named content fallback** — decide now what the site does if material is removed or hosting terms object; decide before takedown day, not during it.
- [ ] **A written first-five-minutes script** — invite → land → chapter 1 → first chat message, designed before more features are added.
- [ ] **One-sentence pitch tested on one friend** — e.g. "A private room where we read Death Note and ORV together and talk about it." If it needs a paragraph, it isn't clear yet.
- [ ] **A weekly-invite milestone** — at least one friend using it end-to-end by an agreed date; likelihood of success is only real once someone other than the founder logs in.
- [ ] **Scope freeze** — anything beyond the brief's scope (new users, public anything, monetization) returns to the board first.

## The strongest version the board can see

The strongest WARS is not the site in the plan — it is a much smaller one: a private reading room. One sentence: *"A private room where we read Death Note and ORV together and talk about it."* Two systems done brilliantly — a manga reader and a novel reader that feel better than the sketchy public alternatives, plus a single chat room with presence and reactions, wrapped in the designed dark-theme UI the founder already has mocked up. No XP, no role ladder, no ban appeals, no DMs, no audit logs; those answer problems ten friends do not have. Privacy is engineered (auth gates + signed URLs), capacity is proven with a spike test before the build deepens, and one friend is invited by a fixed date so the thing is tested against reality rather than a plan. The plan as written is a solid *reference* for what WARS could become if the small version succeeds — it is the wrong build order for finding out whether it will.

## Disagreement to preserve

The Product member scored 4 and effectively said the scope must be halved before a single phase begins; the Offers and Monopoly members scored 6 and were willing to fund the current scope conditional on capacity proof. The chair notes: the Product member's cut is the condition most likely to be skipped under schedule pressure, and it is the one most likely to matter.
