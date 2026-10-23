export const XP_REWARDS = {
  read_chapter: 10,
  send_message: 1,
  review_posted: 15,
  reaction_received: 2,
} as const;

export const XP_DAILY_CAPS = {
  send_message: 50,
  reaction_received: 20,
} as const;

export const MAX_LEVEL = 100;

export const RANKS = [
  { min: 1, max: 9, name: "Rookie" },
  { min: 10, max: 19, name: "Regular" },
  { min: 20, max: 29, name: "Veteran" },
  { min: 30, max: 39, name: "Elite" },
  { min: 40, max: 49, name: "Master" },
  { min: 50, max: 59, name: "Grandmaster" },
  { min: 60, max: 69, name: "Legend" },
  { min: 70, max: 79, name: "Mythic" },
  { min: 80, max: 89, name: "Immortal" },
  { min: 90, max: 99, name: "Transcendent" },
  { min: 100, max: 100, name: "Anime Deity" },
] as const;

export function calculateLevel(totalXp: number): number {
  if (totalXp <= 0) return 1;
  // Level N requires N * 100 cumulative XP
  // Level 2 needs 100, level 3 needs 300, level 4 needs 600...
  // Formula: level = floor((1 + sqrt(1 + 8 * totalXp / 100)) / 2)
  const level = Math.floor(
    (1 + Math.sqrt(1 + (8 * totalXp) / 100)) / 2
  );
  return Math.min(Math.max(level, 1), MAX_LEVEL);
}

export function getRank(level: number): string {
  const rank = RANKS.find((r) => level >= r.min && level <= r.max);
  return rank?.name ?? "Rookie";
}

export function getXpForLevel(level: number): number {
  // Cumulative XP needed to reach this level
  if (level <= 1) return 0;
  return ((level - 1) * level * 100) / 2;
}

export function getXpForNextLevel(currentLevel: number): number {
  if (currentLevel >= MAX_LEVEL) return 0;
  return getXpForLevel(currentLevel + 1);
}

export function getLevelProgress(
  totalXp: number
): { currentLevel: number; currentLevelXp: number; nextLevelXp: number; progress: number } {
  const currentLevel = calculateLevel(totalXp);
  const currentLevelStart = getXpForLevel(currentLevel);
  const nextLevelStart = getXpForLevel(currentLevel + 1);
  const currentLevelXp = totalXp - currentLevelStart;
  const xpNeeded = nextLevelStart - currentLevelStart;
  const progress = xpNeeded > 0 ? currentLevelXp / xpNeeded : 1;

  return {
    currentLevel,
    currentLevelXp,
    nextLevelXp: xpNeeded,
    progress: Math.min(Math.max(progress, 0), 1),
  };
}
