const TOTAL_QUESTION_BANK = 972;
const LEVEL_STAGES = 5;
const STAGE_SIZE = Math.ceil(TOTAL_QUESTION_BANK / LEVEL_STAGES);

export const LEVELS = [
  { index: 0, name: "Seed", icon: "🌰", minCoins: 0, maxCoins: STAGE_SIZE - 1 },
  {
    index: 1,
    name: "Sprout",
    icon: "🌱",
    minCoins: STAGE_SIZE,
    maxCoins: STAGE_SIZE * 2 - 1
  },
  {
    index: 2,
    name: "Seedling",
    icon: "🌿",
    minCoins: STAGE_SIZE * 2,
    maxCoins: STAGE_SIZE * 3 - 1
  },
  {
    index: 3,
    name: "Young Plant",
    icon: "🪴",
    minCoins: STAGE_SIZE * 3,
    maxCoins: STAGE_SIZE * 4 - 1
  },
  {
    index: 4,
    name: "Tree",
    icon: "🌳",
    minCoins: STAGE_SIZE * 4,
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
