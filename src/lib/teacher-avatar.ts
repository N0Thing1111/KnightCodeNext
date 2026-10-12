export function avatar(key: string) {
  return (
    (
      {
        knight: "♞",
        blue: "🛡️",
        mage: "🧙",
        fox: "🦊",
        dragon: "🐉",
        robot: "🤖",
      } as Record<string, string>
    )[key] ?? "♞"
  );
}
