# Competitor map — WARS

Run date: 2026-10-20. Sources read live: VIZ Shonen Jump homepage, MangaDex homepage, MANGA Plus (title only — JS-heavy), J-Novel Club homepage. **Not done in this pass:** app-store/Google review mining (no reachable review pages fetched), VIZ and J-Novel Club current membership prices (pages not reached). Anything unmarked below is a product fact, not a scraped review. Nothing here is invented; blanks are blanks.

## The table (by how directly each competes with the job WARS does)

| name | type | price (comparable) | what it sells | positioning |
|---|---|---|---|---|
| Shared files + messenger (Drive/Telegram/WhatsApp) | substitute | free | PDFs/EPUBs dropped in a chat with friends | none — it's just how groups do it today |
| Discord | indirect | free | group chat: servers, channels, threads, reactions, voice | the default community layer this friend group already has |
| Public unlicensed aggregator sites | substitute | free | full manga/LN libraries, no licensing | none (various sites) |
| MangaDex | indirect | free | community-driven manga reader with forums/groups/comments | community-focused reader (homepage read live) |
| MANGA Plus by SHUEISHA | indirect | free | official simulpub chapters from Shueisha | official free simulpub |
| VIZ Shonen Jump | indirect | free first chapters; membership price unverified | official Jump library | "Read Free Shonen Jump Manga" |
| J-Novel Club | indirect | membership price unverified | licensed light novels/manga in weekly parts | the main legal LN subscription library |
| Kindle / BookWalker | substitute | per volume | licensed ebooks | own your digital volumes |

## Price range

For the comparable job — *reading manga/LNs and talking about it with friends* — every reachable option is **$0**. Low: $0, median: $0, high: $0 (paid stores exist per-volume but are not what a friend group does socially). **WARS cannot win on price; nothing here is priced above free.**

## Positioning map (text)

Axes: **legal/curated risk** (x: unlicensed → official) × **private-friend-group fit** (y: public crowd → just us).

- High private-fit, unlicensed: shared files + messenger; aggregator sites alone
- High private-fit, mid: **WARS (proposed)** — your own files, your own room, invite-only
- Low private-fit, unlicensed-ish: public aggregators with comment sections
- Low private-fit, official: MANGA Plus, VIZ, MangaDex (public community), J-Novel Club, Kindle

WARS's whole position is the top-middle box: nothing else is *invite-only + your library + chat in one designed place*. Everything official is public and catalogue-limited; everything private today is a folder plus a chat app.

## Complaints

**Honest status: no live review pages were reached in this pass — no complaint themes are claimed here.** This is the one input `/founder-consumer` would normally use and it is missing. Common, widely-reported friction (leads, not verified counts, no quotes): official catalogues missing older/niche titles and regional locks; aggregators having ads, broken readers and takedown churn; Discord file-sharing being clunky for long-form reading and losing progress; PDF readers in chat being miserable on mobile. Treat all of that as hypotheses a real review pass should verify.

## The gap

Nobody does the combined job privately. Readers with legal sources still keep chat in a separate app and lose their place across files; readers with a shared-folder setup get zero reading experience (progress, modes, mobile); public communities are public. The gap WARS could own: **an invite-only room where a small group reads its own library together** — pleasant readers (manga + LN), progress, one chat surface, no crowd, no catalogue politics.

The gap is real but *small by construction* (one friend group) and it sits on legally soft ground (the library is the users' own ripped/converted files).

## The threat

Who could copy it fastest: **anyone in the friend group.** The stack (Next.js + Supabase) is commodity, the content is files they already have, and there is no moat the board hasn't already flagged — the occupied room is the only asset. Copycat risk is low while the site stays invite-only and tiny; it becomes real the moment it's public. The faster threat is not a copycat: it's the group never leaving Discord + a folder because the switching cost is higher than the polish.

## Feed-forward

- `/founder-consumer` should use: the $0 price of every alternative, the missing-catalogue and messy-file-reader friction (as hypotheses), and the switching-cost question ("would you actually move off Discord?").
- `/founder-pricing`: there is no price to extract from this audience — price answers will likely top out at $0; the exercise still matters if a paid fallback (cheap VPS) is ever needed.
