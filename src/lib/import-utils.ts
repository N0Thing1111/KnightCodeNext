export type ImportRow = {
  name: string;
  email: string;
  username: string;
  section: string;
};
export function normalizeRow(raw: Record<string, unknown>): ImportRow {
  const normalized = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [
      k
        .toLowerCase()
        .trim()
        .replaceAll(/[^a-z0-9]+/g, "_"),
      String(v ?? "").trim(),
    ]),
  );
  const first = normalized.first_name || normalized.firstname || "",
    last = normalized.last_name || normalized.lastname || "";
  return {
    name: normalized.name || [first, last].filter(Boolean).join(" "),
    email: (normalized.email || "").toLowerCase(),
    username: (normalized.username || "").toLowerCase(),
    section: normalized.section || normalized.class_section || "",
  };
}
