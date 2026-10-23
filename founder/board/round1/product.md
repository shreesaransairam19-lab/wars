# Product lens
Score: 4 | Vote: FUND IF

## What is strong

- The brief knows what it is: a private site for ~10 friends, with explicit non-goals (no revenue, no launch, no growth). That clarity of scope-at-the-business-level is rare and it makes the goal testable: it works, reading is pleasant, chat is fun, nothing leaks, limits hold.
- The experience the founder actually cares about is named first: a polished reading experience (Death Note, ORV) with two reading modes, progress saving, and bookmarks. That is a real moment a person has — lying back, scrolling chapters — and it is the right thing to want to do brilliantly.
- Decisions that create seams have already been surfaced instead of hidden: the 50MB file cap forcing offline pre-processing of the 200MB PDF, client-side EPUB parsing, the 1GB storage ceiling, the 7-day inactivity pause. A founder who writes the constraints into the brief is less likely to cut corners where nobody is looking.
- Design direction is settled (mockup, fonts, dark theme + toggle), so craft effort can go into execution rather than re-litigation.

## What would kill it (the top 3, most dangerous first)

1. **No focus — six products in one brief.** Reading (two formats, two modes, progress, bookmarks) + full Discord-style chat (servers → channels → rooms, realtime, reactions, replies, DMs, presence) + ratings/reviews with moderation + XP/levels/ranks + a five-tier role system with mute, ban, ban appeals, reports, and audit logs. The lens's first question is "what to cut until one thing is left." The brief cuts nothing. For a solo founder on a 12-week plan, the un-cut list is the most likely single cause of failure against the stated goal — not budget, not skill.
2. **The first five minutes are undesigned.** A friend gets an invite. Then what? Land on a library? A chat lobby? A login screen? The brief describes features, not the sequence a new user actually walks through. If that path isn't designed, "reading is pleasant" and "chat is fun" are untested assumptions, and onboarding ~10 friends one at a time will founder on ambiguity. Related: chat duplicates Discord, which this friend group almost certainly already uses — the product must earn its chat on minute one or it's dead weight.
3. **Seams that break the stated goal of "works reliably."** (a) Supabase Free pausing after 7 days of inactivity: friends arrive at a dead site — the most visible possible failure of reliability. (b) The brief states ~2 concurrent realtime connections against ~10 users in a chat product; if that ceiling is real, group chat breaks on the night it gets busy. (c) The content pipeline: a 200MB PDF hand-processed offline into per-chapter WebP sets — who does that for the next series or the next chapter, and what happens to the experience when a chapter is missing or a batch is half-uploaded? These are all handoffs between systems where the experience breaks.

## The questions I would ask the founder

1. What is the one thing? If a friend could only use one feature after accepting the invite, which is it — and what gets cut so that feature is brilliant?
2. Walk me through the first five minutes for a new invitee, step by step, from clicking the link to reading chapter 1 and saying something in chat. Where do they land?
3. Why not Discord + a reader link? What does this site do in the first session that the current setup doesn't?
4. The brief says ~2 concurrent realtime connections and a 7-day inactivity pause. What actually happens the night all 10 friends are chatting, and what happens after a quiet week? (Fact needed → /founder-cfo, which answers free-tier limits and what breaks at 10 users.)
5. Which of these is cut first if the 12-week plan slips: XP/ranks, ban appeals and audit logs, DMs, or moderated reviews?
6. Do the ~10 friends actually want ratings and reviews, or is that the founder building for an audience he imagines? (Fact needed → /founder-consumer.)
7. What stops a friend from just using an established manga site and existing chat — is there a competitor-shaped reason they'd stay here? (Fact needed → /founder-competitors.)

## If FUND IF: the conditions

1. **Cut to two systems:** the reading experience (both readers, progress, bookmarks) and one thin chat surface (a single room or two, messages + presence). Ship XP/levels/ranks, DMs, the full role ladder with ban appeals, audit logs, and moderated reviews as later phases or not at all — the goal never required them.
2. **A written first-five-minutes script:** the exact invite → land → first chapter → first message path, designed before more features are added.
3. **Resolve the reliability seams up front:** confirm from /founder-cfo whether ~2 realtime connections and the 7-day pause actually hold for ~10 users, and fix the wake-up/pause and content-ingestion story (next chapter, next series) before calling the build done.
4. **One-sentence pitch, tested on one friend:** e.g. "A private room where we read Death Note and ORV together and talk about it." If the sentence needs a paragraph, the product isn't clear yet.
