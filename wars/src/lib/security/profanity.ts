// Basic English profanity filter for user chat. Keep entries normalized to
// lowercase ASCII; normalizeProfanityText handles common punctuation, spacing,
// repeated letters, and leetspeak before checking them.
const BLOCKED_WORDS = new Set([
  "arse", "arsehole", "ass", "asshat", "asshole", "assholes", "asswipe", "bastard", "bastards",
  "bitch", "bitches", "bitching", "bullshit", "cock", "cocks",
  "crap", "cunt", "cunts", "dammit", "damn", "damned", "dick", "dicks",
  "dickhead", "douche", "fag", "faggot", "faggots", "fuck", "fucked",
  "fucker", "fuckers", "fuckhead", "fucking", "fucks", "motherfucker",
  "motherfuckers", "motherfucking", "nigga", "niggas", "nigger", "niggers", "piss",
  "pissed", "pissing", "prick", "pussy", "shit", "shits", "shitty", "slut", "sluts",
  "twat", "wanker", "whore", "whores", "retard", "retarded", "retards", "hell",
]);

// These are unambiguous racial slurs, kept separate so the chat API can apply
// the stricter immediate-ban rule rather than only rejecting the message.
const RACIST_SLURS = new Set([
  "nigga", "niggas", "nigger", "niggers", "chink", "chinks", "spic", "spics",
  "kike", "kikes", "gook", "gooks", "wetback", "wetbacks", "paki", "pakis",
  "coon", "coons",
]);

const LEETSPEAK: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  "$": "s",
};

function normalizeProfanityText(text: string): string[] {
  const normalized = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase()
    .replace(/[013457@$]/g, (character) => LEETSPEAK[character] ?? character)
    // Ignore punctuation between letters (e.g. f.u.c.k), while spaces still
    // mark word boundaries. Repeated characters catch forms like shiiiit.
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/(.)\1{2,}/g, "$1");

  const words = normalized.match(/[\p{L}\p{N}]+/gu) ?? [];
  const compactRuns: string[] = [];
  let singles = "";
  for (const word of words) {
    if (word.length === 1) {
      singles += word;
      continue;
    }
    if (singles) compactRuns.push(singles);
    singles = "";
    compactRuns.push(word);
  }
  if (singles) compactRuns.push(singles);

  return [...words, ...compactRuns];
}

export function containsProfanity(text: string): boolean {
  return normalizeProfanityText(text).some((word) => BLOCKED_WORDS.has(word));
}

export function containsRacistSlur(text: string): boolean {
  return normalizeProfanityText(text).some((word) => RACIST_SLURS.has(word));
}
