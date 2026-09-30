const configuredLevels = process.env.NEXT_PUBLIC_AVAILABLE_GAME_LEVELS;

export const availableGameLevels = new Set(
  (configuredLevels ?? "1,2,3,4,5,6,13")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0),
);

export function isGameLevelAvailable(levelNumber: number) {
  return availableGameLevels.has(levelNumber);
}
