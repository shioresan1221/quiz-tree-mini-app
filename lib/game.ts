export const LEVELS = [
  { index: 0, name: "Seed", icon: "🌱", minCoins: 0, maxCoins: 24 },
  { index: 1, name: "Sprout", icon: "🌿", minCoins: 25, maxCoins: 74 },
  { index: 2, name: "Sapling", icon: "🪴", minCoins: 75, maxCoins: 179 },
  { index: 3, name: "Mature Tree", icon: "🌳", minCoins: 180, maxCoins: 359 },
  {
    index: 4,
    name: "Ancient Tree",
    icon: "👑",
    minCoins: 360,
    maxCoins: Number.POSITIVE_INFINITY
  }
] as const;

export const CUSTOM_COUNTS = [15, 20, 30, 50, 60, 70, 80, 90] as const;

export function getTreeStage(coins: number) {
  return LEVELS.find((stage) => coins >= stage.minCoins && coins <= stage.maxCoins) ?? LEVELS[0];
}

export function coinsToLevel(coins: number) {
  return getTreeStage(coins).index + 1;
}

export function formatMistakeCount(mistakeIds: string) {
  if (!mistakeIds) {
    return "0";
  }

  return String(
    mistakeIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean).length
  );
}

export function joinMistakes(existing: string, nextId: string) {
  const set = new Set(
    existing
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );

  set.add(nextId);
  return Array.from(set).join(",");
}
