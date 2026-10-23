# Offers lens
Score: 6 | Vote: FUND IF

## What is strong

- **The market is pre-sold.** The Offers lens says pick the market first: pain
  massive, buyers reachable, buyers have money. Here two of four fail by design
  (mild pain — convenience, not desperation; zero money spent) and one is
  perfect: the ten buyers are already known, already friends, one invite away.
  For the stated goal — a working private site for ~10 friends — reach is a
  solved problem, which is the hardest market problem this lens cares about.
  Scored as a *commercial* offer this would be a PASS: there is no paying market,
  no price, and therefore no way to answer "could you double the price and still
  be the obvious choice." I score it against the founder's own goal instead.
- **The value equation's "likelihood" column is unusually strong.** Dream
  outcome: one private place with pleasant manga/LN reading plus Discord-style
  chat, instead of juggling a reader site and a chat app. Likelihood of getting
  it: high — the founder is technical, the stack (Next.js 15 + Supabase) fits
  the skills, the plan is phased into 8 phases over 12 weeks, and the content
  set is already fixed (Death Note + ORV). Nothing here depends on outside
  behavior.
- **The stack answers real problems on the way to the outcome.** Per-chapter
  WebP pre-processing solves the 50MB file cap; client-side EPUB parsing solves
  the novel reader; progress saving, bookmarks, presence, reactions and replies
  each map to a friction a reader/chat user actually hits. Cheap to deliver,
  valuable to the user — the lens's stacking test.
- **It does not compete on price; it competes on consolidation.** Every
  alternative (Discord alone, a public reader site alone) is also free, so
  "cheaper" is meaningless. The differentiator the lens asks for — so good people
  feel stupid saying no — is the combined package: reading + chat + progression
  in one private, invite-only space with a designed dark-theme UI. That is a
  genuine, if small, "more of the outcome" play.

## What would kill it (the top 3, most dangerous first)

1. **Free-tier capacity versus the stated success criterion.** The goal says
   "works reliably for ~10 users... free-tier limits are not blown," but the
   brief's own enforced constraints are ~2 concurrent realtime connections,
   1GB total storage, 2GB egress/month, and a 7-day inactivity pause — against
   ~10 chatters, a ~200MB pre-processed Death Note, and a solo founder who may
   not log in for a week. The offer's core promise (reliable private community)
   is capped by infrastructure the founder does not control. If Supabase pauses
   the project mid-week or the fifth friend can't hold a realtime connection,
   the dream outcome collapses. This is the difference between FUND and PASS.
2. **Effort and time-to-first-use are heavy for a solo 12-week build.** The
   value equation scores worst on effort — and here the effort is levied on the
   founder: manga pipeline, EPUB reader, full chat stack with DMs and presence,
   ratings with moderation, XP/ranks, roles, ban appeals, audit logs. Eight
   phases is a lot of surface area before any friend gets an invite. If the
   build drags past the point where the friends are still interested, the
   offer expires; there is no lock-in and Discord is one tab away.
3. **No guarantee is possible, and the content base is legally soft.** This
   lens strengthens offers with a real guarantee; a $0 hobby site can offer
   none — no uptime guarantee on free tiers, no refund, no SLA. Combined with
   hosting copyrighted Death Note and ORV material (risk explicitly "accepted"),
   a hosting-provider or storage-policy action is an uncancellable kill switch.
   The brief acknowledges the risk, which is honest; it does not yet name a
   fallback if it fires.

## The questions I would ask the founder

1. Has anyone actually tested 10 concurrent users against the ~2 realtime
   connection limit and the 1GB/2GB caps, or is that number from the docs only?
   What breaks first?
2. What is the minimum slice that gets the first friend invited — reader + chat,
   or all eight phases? Which phases can be cut without changing the goal?
3. What do the ten friends use today (Discord? a public reader? both?), and what
   would make them move — this is the "why would they believe it works" test.
   Open question: the competitive/alternative landscape is not in the brief —
   **/founder-competitors** answers what those friends currently use instead,
   and **/founder-consumer** answers whether the pain is real enough to move
   them.
4. If Supabase or Vercel free tiers change or the copyright risk fires, what is
   the fallback, and does it stay at $0? Cost and runway of any paid fallback is
   an open question — **/founder-cfo** answers it.
5. What does "done" look like on week 12, and what happens if it slips to week
   20 — does the offer survive the delay?

## If FUND IF: the conditions

1. **Capacity proof before feature build:** a spike test demonstrating ~10
   concurrent realtime users and the Death Note content set within the stated
   free-tier caps (storage, egress, connections, 7-day pause), with a written
   plan for what happens when a cap is hit.
2. **Scope cut to a v1 slice:** reading + chat + accounts ship first; ratings,
   XP/ranks, ban appeals and audit logs land only after the first friend is
   active on the site. The 12-week plan re-cut to match.
3. **A named content fallback:** an explicit decision on what the site does if
   the copyrighted material is removed or hosting terms object — decided now,
   not at takedown time.
4. **A weekly-invite milestone:** at least one friend using it end-to-end by an
   agreed date, because likelihood-of-success in the value equation is only
   real once someone other than the founder logs in.
