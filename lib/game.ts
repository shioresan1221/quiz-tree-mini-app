export const LEVELS = [
  { index: 0, name: "Seed", icon: "🌱", minCoins: 0, maxCoins: 499 },
  { index: 1, name: "Sprout", icon: "🌿", minCoins: 500, maxCoins: 1499 },
  { index: 2, name: "Sapling", icon: "🪴", minCoins: 1500, maxCoins: 3499 },
  { index: 3, name: "Mature Tree", icon: "🌳", minCoins: 3500, maxCoins: 6999 },
  {
    index: 4,
    name: "Ancient Tree",
    icon: "👑",
    minCoins: 7000,
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
