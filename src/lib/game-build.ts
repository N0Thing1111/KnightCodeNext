const configuredLevels = process.env.NEXT_PUBLIC_AVAILABLE_GAME_LEVELS;
export const availableGameLevels = new Set((configuredLevels ?? "1,2,3,4,5,6,7,13").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0));
export function isGameLevelAvailable(level: { level_number: number; build_available?: boolean }) {
  return level.build_available ?? availableGameLevels.has(level.level_number);
}
