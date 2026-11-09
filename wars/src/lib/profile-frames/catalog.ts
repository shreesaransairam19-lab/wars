export const PROFILE_FRAMES = [
  {
    id: "crunching-fang",
    name: "Crunching Fang",
    priceInr: 100,
    description: "Animated silver fangs snap shut in a crimson glow.",
    gradient: "conic-gradient(from 0deg, #090b12, #475569, #f8fafc, #64748b, #10131c, #e2e8f0, #090b12)",
    glow: "conic-gradient(#7f1d1d, #ef4444, #fca5a5, #450a0a, #dc2626, #7f1d1d)",
  },
] as const;

export type ProfileFrameId = (typeof PROFILE_FRAMES)[number]["id"];
export type ProfileFrame = (typeof PROFILE_FRAMES)[number];

export function getProfileFrame(frameId: string | null | undefined) {
  return PROFILE_FRAMES.find((frame) => frame.id === frameId) ?? null;
}

export function getLevelsForPrice(priceInr: number) {
  return Math.floor(priceInr / 100);
}
