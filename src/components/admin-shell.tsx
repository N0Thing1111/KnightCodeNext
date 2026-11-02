"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Profile } from "@/types/database";

const groups = [
  { label: "Platform", links: [["/admin", "overview", "Overview"]] },
  {
    label: "Accounts",
    links: [
      ["/admin/manage/students", "users", "Student accounts"],
      ["/admin/manage/teachers", "users", "Teacher accounts"],
      ["/admin/manage/classes", "sections", "Sections"],
    ],
  },
  {
    label: "Learning content",
    links: [
      ["/admin/manage/lessons", "book", "Lessons & Python"],
      ["/admin/manage/levels", "levels", "Game levels"],
    ],
  },
  {
    label: "Platform operations",
    links: [
      ["/admin/results", "records", "Learning records"],
      ["/admin/backup", "backup", "Backups & recovery"],
      ["/admin/data", "data", "Data management"],
      ["/admin/audit", "audit", "Audit history"],
    ],
  },
  {
    label: "Settings",
    links: [["/admin/settings", "settings", "Platform & account"]],
  },
];
function NavIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    users:
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    sections: "M3 3h18v18H3z M3 9h18 M9 9v12",
    book: "M12 5v16 M12 5C9 3 5 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1",
    levels: "m12 3 10 5-10 5L2 8z M2 12l10 5 10-5 M2 16l10 5 10-5",
    records: "M4 3h16v18H4z M8 7h8 M8 12h8 M8 17h4",
    backup: "M4 3h16v5H4z M5 8v13h14V8 M9 12h6",
    data: "M3 5h18 M3 12h18 M3 19h18 M7 2v6 M17 9v6 M10 16v6",
    audit: "M3 12a9 9 0 1 0 3-6.7 M3 3v5h5 M12 7v5l3 2",
    settings:
      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2",
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function AdminShell({
  admin,
  children,
}: {
  admin: Profile;
  children: React.ReactNode;
}) {
  const path = usePathname(),
    [menu, setMenu] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.theme = admin.theme_preference;
    document.body.classList.add("teacher-body", "admin-body");
    return () => document.body.classList.remove("teacher-body", "admin-body");
  }, [admin.theme_preference]);
  const active = (href: string) =>
    href === "/admin"
      ? path === "/admin"
      : href === "/admin/manage/classes"
        ? path.startsWith(href) || path.startsWith("/admin/classes/")
        : href === "/admin/manage/students"
          ? path.startsWith(href) || path.startsWith("/admin/import/students")
          : href === "/admin/manage/teachers"
            ? path.startsWith(href) || path === "/admin/import"
            : href === "/admin/results"
              ? path.startsWith(href) || path === "/admin/python"
              : path.startsWith(href);
  return (
    <div className="teacher-shell">
      <aside className={"teacher-sidebar " + (menu ? "open" : "")}>
        <div className="teacher-brand">
          <Link href="/admin">
            <img src="/assets/img/knight-logo.png" alt="" />
            <span>
              Knight<span>Code</span>
              <small>Platform Administration</small>
            </span>
          </Link>
          <button onClick={() => setMenu(false)} aria-label="Close menu">
            ×
          </button>
        </div>
        <nav aria-label="Administration">
          {groups.map((group) => (
            <div className="admin-nav-group" key={group.label}>
              <span className="teacher-nav-label">{group.label}</span>
              {group.links.map(([href, icon, label]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenu(false)}
                  aria-current={active(href) ? "page" : undefined}
                  className={
                    "teacher-nav-link " + (active(href) ? "active" : "")
                  }
                >
                  <NavIcon name={icon} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="teacher-side-bottom">
          <form action="/admin-logout" method="post">
            <button type="submit" className="teacher-btn">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <header className="teacher-topbar">
        <div className="teacher-top-left">
          <button
            className="teacher-menu"
            onClick={() => setMenu(true)}
            aria-label="Open navigation"
          >
            ☰
          </button>
          <div>
            <h1>{pageTitle(path)}</h1>
          </div>
        </div>
        <Link className="teacher-user" href="/admin/settings">
          <span aria-hidden="true">
            {admin.name.trim().slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{admin.name}</strong>
            <small>Platform Administrator</small>
          </div>
        </Link>
      </header>
      <main className="teacher-main">{children}</main>
    </div>
  );
}
function pageTitle(path: string) {
  if (path === "/admin") return "Platform overview";
  if (path.includes("/manage/teachers")) return "Teacher accounts";
  if (path.includes("/manage/students")) return "Student accounts";
  if (path.includes("/manage/classes") || path.includes("/classes/"))
    return "Sections";
  if (path.includes("/manage/lessons")) return "Lessons & Python activities";
  if (path.includes("/manage/levels")) return "Game levels";
  if (path.includes("/import/students")) return "Import student accounts";
  if (path === "/admin/import") return "Import teacher accounts";
  if (path.includes("/results")) return "Learning records";
  if (path.includes("/audit")) return "Audit History";
  if (path.includes("/settings")) return "Platform & account settings";
  if (path.includes("/backup")) return "Backup & Recovery";
  if (path.includes("/data")) return "Data Management";
  return "Platform Administration";
}
