# Monopoly lens
Score: 6 | Vote: FUND IF

## What is strong

- **Distribution, the half the lens says most products miss, is already solved.** The first ~10 users arrive by invitation from the founder himself, at $0 CAC. The Monopoly lens demands dominating a small market before expanding; WARS takes 100% of its target "market" (this friend group) by construction, and explicitly declines to expand. Against the lens's own demand, that is a pass — not earned, but satisfied.
- **Timing is genuine.** "Why now" has a real answer: Supabase Realtime + Free Postgres with RLS + Vercel Hobby make a Discord-grade realtime chat stack buildable and runnable at $0 by one person. Two years earlier this cost a server and a sysadmin. The 50MB-per-file cap forcing an offline PDF→per-chapter WebP pipeline is actual non-obvious know-how — small, but it is a secret in the lens's sense: something the founder knows that a naive builder would hit face-first.
- **Tiny network effects exist in the right direction.** Chat, reactions, reviews, and XP only work because *these specific people* are in the room. Within its scope the private social graph is the moat: your friends are here, not on Discord, because you invited them here. A copycat in month six has nothing to copy that matters — the value is the occupied room, not the code.
- **The goal and the strategy are consistent.** The brief does not pretend to a market it isn't going after. A Monopoly-lens complaint about "no expansion path" would be judging a business the founder did not pitch.

**Honest lens caveats, stated plainly:** the engineering is incremental, not a 10x breakthrough — standard Next.js 15 + Supabase, no proprietary tech. The "durable for ten years" question is undefined for a private friends site and I am not scoring it as a failure. The lens fundamentally assumes a competitive market with buyers; this pitch has neither, so several of its questions return "not applicable" rather than "no." I scored what applies.

## What would kill it (the top 3, most dangerous first)

1. **The free-tier ceilings, which threaten the stated goal directly.** The brief lists ~2 concurrent realtime connections for ~10 users, 1GB total storage, 2GB egress/month, 50MB per file, and a 7-day inactivity pause. If the realtime cap is really ~2, the product fails at its first group chat session. If egress is blown by serving WebP chapter images, the reading experience dies mid-month. "Works reliably for ~10 users" is the success criterion — this is the thing most likely to break it, and it can break in week one. *Open question: the actual current Supabase Free concurrent-realtime and storage/egress numbers, and whether the Death Note WebP asset set fits with headroom — /founder-cfo.*
2. **Platform and copyright exposure.** Hosting Death Note content, even privately, is infringement; "nothing leaks publicly" is currently a hope, not a control. One forwarded invite link, one public storage URL, or one indexing slip → DMCA to Vercel/Supabase → account suspension → the site is gone. The durability question in this lens collapses to: the position isn't held by a moat, it's held by nobody noticing. *Open question: how many of the ~10 friends actually keep WARS as their primary reader/chat over a month vs. drifting back to existing habits — /founder-consumer.*
3. **Single-maintainer fragility with no copycat defense if anything changes.** Solo founder, 8 phases, 12 weeks, then indefinite maintenance. If he stops, the site pauses within 7 days (Supabase inactivity) and quietly rots. And if the group ever grows past friends-of-friends, the absence of any moat — no proprietary tech 10x better, no brand, no scale economies — means the first person who says "I'll host this myself" takes the users. *Open question: which alternatives the same buyers use within reach today (Discord, Google Drive + any reader, other private sites) and how they compare — /founder-competitors.*

## The questions I would ask the founder

1. Your ten friends already have free, excellent chat in Discord. What does WARS give them that Discord doesn't — one specific thing — and would they say the same sentence you just said?
2. If Supabase doubles its free-tier prices or kills a feature next quarter, what breaks first, and what is your fallback for that piece?
3. "Nothing leaks publicly" — walk me through the actual mechanism. Are storage URLs signed and short-lived? Is the deployment auth-gated before any content loads? What stops a friend re-sharing their invite?
4. What do you know about how these ten friends read and talk about manga that a generic Discord server plus a folder of files doesn't already cover? (This is the lens's "secret" question — I want the honest version, even if the answer is "nothing, I just wanted to build it.")
5. Define the failure case for your own goal: the site works, but two months in only three of ten people show up. Is that a pass or a fail for you?

## If FUND IF: the conditions

1. **Verified headroom before build, not after.** Confirm actual Supabase Free limits (concurrent realtime connections, storage, egress) against the real Death Note WebP asset set and 10 simultaneous users, with a named degradation plan if a limit is hit. Answer owned by /founder-cfo.
2. **Privacy as an engineered control, not an intention.** Auth-gated routes and signed/expiring storage URLs before any content uploads; no public indexing; a written takedown/rotation plan (rotate storage paths, pull content) ready before launch.
3. **Scope freeze at the 8 planned phases.** Anything beyond the brief's own scope — new users, public anything, monetization — returns to the board first. Success stays exactly as the brief defines it: reliable for ~10 users, pleasant reading, working chat, nothing public, free-tier limits intact.
