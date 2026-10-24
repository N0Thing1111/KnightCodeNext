import Link from "next/link";
import { AdminHero } from "@/components/admin-ui";

const views = [
  { key: "history", label: "Run history", href: "/admin/data?scope=history" },
  { key: "learning", label: "Learning records reset", href: "/admin/data?scope=learning" },
  { key: "school", label: "School data reset", href: "/admin/data?scope=school" },
  { key: "backup", label: "Save or restore school data", href: "/admin/backup" },
] as const;

export function AdminDataNavigation({ active }: { active: typeof views[number]["key"] }) {
  return (
    <>
      <AdminHero
        title="Data Management"
        description="Save or restore school data, clean up run history, or reset learning and school records."
      />
      <nav className="teacher-card admin-data-navigation" aria-label="Data management sections">
        <div className="admin-data-links">
          {views.map(({ key, label, href }) => (
            <Link
              key={key}
              href={href}
              className={"teacher-btn" + (active === key ? " primary" : "")}
              aria-current={active === key ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </div>
        <p className="admin-note">Run history cleanup preserves learning progress and feedback. The reset sections can erase those records. Save a backup before clearing data.</p>
      </nav>
    </>
  );
}
