// Supports legacy save files until their two name fields have been normalized.
export function sectionLabel(section: {
  name: string;
  section?: string | null;
}) {
  const name = section.name.trim(),
    suffix = section.section?.trim();
  return suffix && suffix !== name ? `${name} - ${suffix}` : name;
}
