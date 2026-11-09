export const PROFILE_FRAMES = [
  {
    id: "crunching-fang",
    name: "Crunching Fang",
    priceInr: 100,
    description: "Animated silver fangs snap shut in a crimson glow.",
    gradient: "conic-gradient(from 0deg, #090b12, #475569, #f8fafc, #64748b, #10131c, #e2e8f0, #090b12)",
    glow: "conic-gradient(#7f1d1d, #ef4444, #fca5a5, #450a0a, #dc2626, #7f1d1d)",
  },
  {
    id: "thunder-sparking",
    name: "Thunder Sparking",
    priceInr: 100,
    description: "Jagged golden lightning bolts snap around your portrait in an electric flash.",
    gradient: "conic-gradient(from 0deg, #422006, #facc15, #fff7ae, #fde047, #fff, #eab308, #713f12, #422006)",
    glow: "conic-gradient(#eab308, #fff7ae, #facc15, #fff, #ca8a04)",
  },
  {
    id: "water-splash",
    name: "Water Splash",
    priceInr: 100,
    description: "A flowing aqua wave ripples around your portrait.",
    gradient: "conic-gradient(from 0deg, #083344, #06b6d4, #cffafe, #0ea5e9, #14b8a6, #082f49, #083344)",
    glow: "conic-gradient(#06b6d4, #e0f2fe, #2dd4bf, #0284c7, #67e8f9)",
  },
  {
    id: "fire-blast",
    name: "Fire Blast",
    priceInr: 100,
    description: "A blazing red and gold aura surges around your portrait.",
    gradient: "conic-gradient(from 0deg, #450a0a, #ef4444, #f97316, #fef08a, #dc2626, #7f1d1d, #450a0a)",
    glow: "conic-gradient(#ef4444, #fde68a, #f97316, #b91c1c, #fb7185)",
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
