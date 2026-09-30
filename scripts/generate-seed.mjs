import fs from "node:fs";
const root = new URL("../", import.meta.url),
  data = JSON.parse(
    fs.readFileSync(
      new URL("supabase/reference-curriculum.json", root),
      "utf8",
    ),
  );
data.achievements ??= [
  {
    id: 1,
    name: "First Steps",
    description: "Complete your first level.",
    icon: "🎯",
    requirement_type: "levels_completed",
    requirement_value: 1,
  },
  {
    id: 2,
    name: "Rising Knight",
    description: "Complete 10 levels.",
    icon: "⚔️",
    requirement_type: "levels_completed",
    requirement_value: 10,
  },
  {
    id: 3,
    name: "Code Champion",
    description: "Complete every active level.",
    icon: "🏆",
    requirement_type: "full_course",
    requirement_value: 1,
  },
  {
    id: 4,
    name: "On a Roll",
    description: "Build a 3-day learning streak.",
    icon: "🔥",
    requirement_type: "streak",
    requirement_value: 3,
  },
  {
    id: 5,
    name: "Unstoppable",
    description: "Build a 7-day learning streak.",
    icon: "⚡",
    requirement_type: "streak",
    requirement_value: 7,
  },
  {
    id: 6,
    name: "XP Hunter",
    description: "Earn 1,000 XP.",
    icon: "⭐",
    requirement_type: "xp",
    requirement_value: 1000,
  },
];
const literal = (value) =>
  value === null
    ? "null"
    : typeof value === "number"
      ? String(value)
      : typeof value === "boolean"
        ? value
          ? "true"
          : "false"
        : `$kc$${String(value).replaceAll("$kc$", "$ k c $")}$kc$`;
const booleanColumns = new Set([
  "active",
  "starter_code_enabled",
  "starter_code_locked",
]);
const lessonColumns = [
  "id",
  "title",
  "description",
  "learning_objective",
  "content",
  "order_number",
  "active",
];
const levelColumns = [
  "id",
  "lesson_id",
  "level_number",
  "order_in_lesson",
  "title",
  "description",
  "difficulty",
  "xp_reward",
  "active",
  "starter_code_enabled",
  "starter_code_template",
  "starter_code_locked",
];
const achievementColumns = [
  "id",
  "name",
  "description",
  "icon",
  "requirement_type",
  "requirement_value",
];
function valueFor(row, column) {
  const fallback =
    column === "xp_reward"
      ? 100
      : column === "starter_code_template"
        ? ""
        : column.startsWith("starter_code_")
          ? false
          : column === "active"
            ? true
            : null;
  const value = row[column] ?? fallback;
  return booleanColumns.has(column) ? Boolean(Number(value)) : value;
}
function insert(table, columns, rows) {
  return `insert into public.${table}(${columns.join(",")}) values\n${rows.map((row) => "  (" + columns.map((c) => literal(valueFor(row, c))).join(",") + ")").join(",\n")}\non conflict(id) do update set ${columns
    .filter((c) => c !== "id")
    .map((c) => `${c}=excluded.${c}`)
    .join(
      ",",
    )};\nselect setval(pg_get_serial_sequence('public.${table}','id'),coalesce((select max(id) from public.${table}),1),true);\n`;
}
const sql = `-- Current KnightCode curriculum copied from the isolated presentation reference.\n-- Safe to rerun: stable IDs are upserted.\n\n${insert("lessons", lessonColumns, data.lessons)}\n${insert("levels", levelColumns, data.levels)}\n${insert("achievements", achievementColumns, data.achievements)}`;
fs.writeFileSync(new URL("supabase/seed.sql", root), sql);
console.log(
  `Generated ${data.lessons.length} lessons, ${data.levels.length} levels, and ${data.achievements.length} achievements.`,
);
