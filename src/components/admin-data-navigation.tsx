import Link from "next/link";
import { AdminHero } from "@/components/admin-ui";

const views = [
  {
    key: "history",
    label: "Run history cleanup",
    href: "/admin/data?scope=history",
  },
  {
    key: "learning",
    label: "Learning reset",
    href: "/admin/data?scope=learning",
  },
  {
    key: "school",
    label: "Platform reset",
    href: "/admin/data?scope=platform",
  },
  { key: "backup", label: "Backups & restore", href: "/admin/backup" },
] as const;

export function AdminDataNavigation({
  active,
}: {
  active: (typeof views)[number]["key"];
}) {
  return (
    <>
      <AdminHero
        title="Data Management"
        description="Back up, restore, or clear platform records."
      />
      <nav
        className="teacher-card admin-data-navigation"
        aria-label="Data management sections"
      >
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
        <p className="admin-note">
          Cleanup keeps progress and feedback. Resets can erase them. Back up
          first.
        </p>
      </nav>
    </>
  );
}
