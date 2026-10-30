"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Profile } from "@/types/database";

const links = [
  ["/admin/registrations", "", "Teacher registrations"],
  ["/admin", "⌂", "Overview"],
  ["/admin/manage/teachers", "♜", "Teachers"],
  ["/admin/manage/students", "♙", "Students"],
  ["/admin/manage/classes", "▦", "Sections"],
  ["/admin/manage/lessons", "▤", "Lessons"],
  ["/admin/manage/levels", "⌘", "Levels"],
  ["/admin/results", "◷", "Session results"],
  ["/admin/audit", "☷", "Audit history"],
  ["/admin/settings", "◐", "Profile & Settings"],
  ["/admin/data", "⚙", "Data management"],
];
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
    href === "/admin" ? path === "/admin" : path.startsWith(href);
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
          <span className="teacher-nav-label">Platform workspace</span>
          {links.map(([href, icon, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenu(false)}
              className={"teacher-nav-link " + (active(href) ? "active" : "")}
            >
              <i>{icon}</i>
              <span>{label}</span>
            </Link>
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
            <span>KNIGHTCODE · PLATFORM ADMIN</span>
            <h1>{pageTitle(path)}</h1>
          </div>
        </div>
        <Link className="teacher-user" href="/admin/settings">
          <span>♞</span>
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
  if (path.includes("/manage/teachers")) return "Teachers";
  if (path.includes("/manage/students")) return "Students";
  if (path.includes("/manage/classes") || path.includes("/classes/"))
    return "Sections";
  if (path.includes("/manage/lessons")) return "Lessons";
  if (path.includes("/manage/levels")) return "Levels";
  if (path.includes("/results")) return "Session Results";
  if (path.includes("/audit")) return "Audit History";
  if (path.includes("/settings")) return "Profile & Settings";
  if (path.includes("/backup")) return "Backup & Recovery";
  if (path.includes("/data")) return "Data Management";
  return "Platform Administration";
}
