export const PROFILE_FRAMES = [
  {
    id: "crunching-fang",
    name: "Crunching Fang",
    priceInr: 100,
    unlockLevel: null,
    exclusive: false,
    description: "Animated silver fangs snap shut in a crimson glow.",
    gradient: "conic-gradient(from 0deg, #090b12, #475569, #f8fafc, #64748b, #10131c, #e2e8f0, #090b12)",
    glow: "conic-gradient(#7f1d1d, #ef4444, #fca5a5, #450a0a, #dc2626, #7f1d1d)",
  },
  {
    id: "thunder-sparking",
    name: "Thunder Sparking",
    priceInr: 100,
    unlockLevel: null,
    exclusive: false,
    description: "Jagged golden lightning bolts snap around your portrait in an electric flash.",
    gradient: "conic-gradient(from 0deg, #422006, #facc15, #fff7ae, #fde047, #fff, #eab308, #713f12, #422006)",
    glow: "conic-gradient(#eab308, #fff7ae, #facc15, #fff, #ca8a04)",
  },
  {
    id: "water-splash",
    name: "Water Splash",
    priceInr: 100,
    unlockLevel: null,
    exclusive: false,
    description: "A flowing aqua wave ripples around your portrait.",
    gradient: "conic-gradient(from 0deg, #083344, #06b6d4, #cffafe, #0ea5e9, #14b8a6, #082f49, #083344)",
    glow: "conic-gradient(#06b6d4, #e0f2fe, #2dd4bf, #0284c7, #67e8f9)",
  },
  {
    id: "fire-blast",
    name: "Fire Blast",
    priceInr: 100,
    unlockLevel: null,
    exclusive: false,
    description: "A blazing red and gold aura surges around your portrait.",
    gradient: "conic-gradient(from 0deg, #450a0a, #ef4444, #f97316, #fef08a, #dc2626, #7f1d1d, #450a0a)",
    glow: "conic-gradient(#ef4444, #fde68a, #f97316, #b91c1c, #fb7185)",
  },
  {
    id: "level-100-wings",
    name: "Anime Deity Wings",
    priceInr: 0,
    unlockLevel: 100,
    exclusive: false,
    imageSrc: "/profile-frames/level-100-wings.png",
    description: "Golden phoenix wings and a crimson jewel, awarded when you reach Level 100.",
    gradient: "conic-gradient(from 0deg, #8f1d2c, #f8ba37, #fff2a0, #ef304b, #e8a739, #761f31)",
    glow: "radial-gradient(circle, rgba(255, 197, 55, .82), rgba(205, 25, 65, .42) 60%, transparent 78%)",
  },
  {
    id: "sukuna-frame",
    name: "Sukuna",
    priceInr: 150,
    unlockLevel: null,
    exclusive: true,
    imageSrc: "/profile-frames/sukuna-frame.gif",
    description: "An animated crimson curse frame featuring the King of Curses.",
    gradient: "conic-gradient(from 0deg, #260707, #dc2626, #f97316, #450a0a, #fb7185, #260707)",
    glow: "conic-gradient(#dc2626, #fb7185, #f97316, #7f1d1d, #dc2626)",
  },
  {
    id: "gojo-frame",
    name: "Gojo",
    priceInr: 150,
    unlockLevel: null,
    exclusive: true,
    imageSrc: "/profile-frames/gojo-frame.gif",
    description: "An animated blue-violet frame featuring Satoru Gojo.",
    gradient: "conic-gradient(from 0deg, #111827, #2563eb, #c4b5fd, #7c3aed, #0e7490, #111827)",
    glow: "conic-gradient(#3b82f6, #c4b5fd, #22d3ee, #7c3aed, #3b82f6)",
  },
  {
    id: "asta-frame",
    name: "Asta",
    priceInr: 150,
    unlockLevel: null,
    exclusive: true,
    imageSrc: "/profile-frames/asta-frame.gif",
    description: "An animated anti-magic frame featuring Asta from Black Clover.",
    gradient: "conic-gradient(from 0deg, #180b0b, #dc2626, #f4f4f5, #991b1b, #09090b, #180b0b)",
    glow: "conic-gradient(#ef4444, #f4f4f5, #7f1d1d, #dc2626, #ef4444)",
  },
  {
    id: "yoriichi-frame",
    name: "Yoriichi",
    priceInr: 150,
    unlockLevel: null,
    exclusive: true,
    imageSrc: "/profile-frames/yoriichi-frame.gif",
    description: "An animated red and gold frame featuring Yoriichi Tsugikuni.",
    gradient: "conic-gradient(from 0deg, #290808, #f97316, #facc15, #991b1b, #7f1d1d, #290808)",
    glow: "conic-gradient(#ef4444, #facc15, #fb923c, #991b1b, #ef4444)",
  },
  {
    id: "subaru-frame",
    name: "Subaru",
    priceInr: 150,
    unlockLevel: null,
    exclusive: true,
    imageSrc: "/profile-frames/subaru-frame.gif",
    description: "An animated violet shadow frame featuring Natsuki Subaru.",
    gradient: "conic-gradient(from 0deg, #09090b, #7c3aed, #c4b5fd, #312e81, #111827, #09090b)",
    glow: "conic-gradient(#7c3aed, #c4b5fd, #8b5cf6, #312e81, #7c3aed)",
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
