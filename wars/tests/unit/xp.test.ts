import { describe, it, expect } from "vitest";
import {
  calculateLevel,
  getRank,
  getXpForLevel,
  getLevelProgress,
  MAX_LEVEL,
  XP_REWARDS,
} from "@/lib/xp/calculate";

describe("XP Calculation", () => {
  it("should return level 1 for 0 XP", () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it("should return level 1 for less than 100 XP", () => {
    expect(calculateLevel(99)).toBe(1);
  });

  it("should return level 2 for 100 XP", () => {
    expect(calculateLevel(100)).toBe(2);
  });

  it("should return level 3 for 300 XP", () => {
    expect(calculateLevel(300)).toBe(3);
  });

  it("should never exceed max level", () => {
    expect(calculateLevel(999999)).toBe(MAX_LEVEL);
  });

  it("should handle negative XP gracefully", () => {
    expect(calculateLevel(-100)).toBe(1);
  });
});

describe("Rank System", () => {
  it("should return Rookie for level 1", () => {
    expect(getRank(1)).toBe("Rookie");
  });

  it("should return Regular for level 10", () => {
    expect(getRank(10)).toBe("Regular");
  });

  it("should return Veteran for level 20", () => {
    expect(getRank(20)).toBe("Veteran");
  });

  it("should return Anime Deity for level 100", () => {
    expect(getRank(100)).toBe("Anime Deity");
  });

  it("should return correct rank for mid-level", () => {
    expect(getRank(55)).toBe("Grandmaster");
    expect(getRank(72)).toBe("Mythic");
    expect(getRank(91)).toBe("Transcendent");
  });
});

describe("XP for Level", () => {
  it("should return 0 for level 1", () => {
    expect(getXpForLevel(1)).toBe(0);
  });

  it("should return 100 for level 2", () => {
    expect(getXpForLevel(2)).toBe(100);
  });

  it("should return 300 for level 3", () => {
    expect(getXpForLevel(3)).toBe(300);
  });
});

describe("Level Progress", () => {
  it("should return correct progress at start", () => {
    const progress = getLevelProgress(0);
    expect(progress.currentLevel).toBe(1);
    expect(progress.progress).toBeGreaterThanOrEqual(0);
    expect(progress.progress).toBeLessThanOrEqual(1);
  });

  it("should return progress at level 2", () => {
    const progress = getLevelProgress(100);
    expect(progress.currentLevel).toBe(2);
  });
});

describe("XP Rewards", () => {
  it("should have correct rewards defined", () => {
    expect(XP_REWARDS.read_chapter).toBe(10);
    expect(XP_REWARDS.send_message).toBe(1);
    expect(XP_REWARDS.review_posted).toBe(15);
    expect(XP_REWARDS.reaction_received).toBe(2);
  });
});
