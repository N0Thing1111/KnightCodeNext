/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { TeacherProfile } from "@/lib/teacher-data";
import { avatar } from "@/lib/teacher-data";

export function TeacherShell({
  teacher,
  notifications,
  children,
}: {
  teacher: TeacherProfile;
  notifications: any[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const unread = useMemo(() => items.filter((n) => !n.is_read).length, [items]);
  useEffect(() => {
    document.documentElement.dataset.theme = teacher.theme_preference;
    document.body.classList.add("teacher-body");
    return () => document.body.classList.remove("teacher-body");
  }, [teacher.theme_preference]);
  const links = [
    ["/teacher/dashboard", "⌂", "Dashboard"],
    ["/teacher/classes", "▦", "My Classes"],
    ["/teacher/students", "♙", "Students"],
    ["/teacher/monitoring", "◉", "Student Monitoring"],
    ["/teacher/lessons", "▤", "Lessons"],
    ["/teacher/assignments", "✓", "Assignments"],
    ["/teacher/reports", "▥", "Reports"],
    ["/teacher/announcements", "✦", "Announcements"],
  ];
  const active = (href: string) =>
    pathname === href ||
    (href === "/teacher/classes" && pathname.startsWith("/teacher/class/")) ||
    (href === "/teacher/monitoring" &&
      pathname.startsWith("/teacher/student/")) ||
    (href === "/teacher/lessons" && pathname.startsWith("/teacher/lesson/"));
  const photo = teacher.profile_image
    ? process.env.NEXT_PUBLIC_SUPABASE_URL +
      "/storage/v1/object/public/profile-images/" +
      teacher.profile_image
    : null;
  async function mark(id?: number) {
    const res = await fetch("/api/teacher/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: id ?? null }),
    });
    if (res.ok)
      setItems((v) =>
        v.map((n) => (!id || n.id === id ? { ...n, is_read: true } : n)),
      );
  }
  return (
    <div className="teacher-shell" data-theme={teacher.theme_preference}>
      <aside className={"teacher-sidebar " + (menu ? "open" : "")}>
        <div className="teacher-brand">
          <Link prefetch={false} href="/teacher/dashboard">
            <img src="/assets/img/knight-logo.png" alt="KnightCode" />
            <span>
              Knight<span>Code</span>
              <small>Teacher Portal</small>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMenu(false)}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
        <nav aria-label="Teacher navigation">
          <span className="teacher-nav-label">Workspace</span>
          {links.map(([href, icon, label]) => (
            <Link
              prefetch={false}
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
          <Link
            prefetch={false}
            href="/teacher/profile"
            className={
              "teacher-nav-link " +
              (pathname === "/teacher/profile" ? "active" : "")
            }
          >
            <i>◎</i>
            <span>Profile</span>
          </Link>
          <Link
            prefetch={false}
            href="/teacher-logout"
            className="teacher-nav-link"
          >
            <i>↪</i>
            <span>Logout</span>
          </Link>
        </div>
      </aside>
      <header className="teacher-topbar">
        <div className="teacher-top-left">
          <button
            className="teacher-menu"
            type="button"
            onClick={() => setMenu(true)}
            aria-label="Open navigation"
          >
            ☰
          </button>
          <div>
            <span>KNIGHTCODE · TEACHER</span>
            <h1>{title(pathname)}</h1>
          </div>
        </div>
        <div className="teacher-top-actions">
          <div className="teacher-notify-wrap">
            <button
              className={"teacher-icon-btn " + (unread ? "has-unread" : "")}
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
            >
              🔔{unread > 0 && <b>{unread > 9 ? "9+" : unread}</b>}
            </button>
            <div className="teacher-notify-panel" hidden={!open}>
              <div className="teacher-notify-head">
                <div>
                  <strong>Teacher Notifications</strong>
                  <small>{unread ? unread + " unread" : "All caught up"}</small>
                </div>
                <button onClick={() => mark()} disabled={!unread}>
                  Mark all read
                </button>
              </div>
              {items.length ? (
                <div>
                  {items.map((n) => (
                    <Link
                      prefetch={false}
                      key={n.id}
                      className={
                        "teacher-notice " + (!n.is_read ? "unread" : "")
                      }
                      href={n.link || "#"}
                      onClick={() => mark(n.id)}
                    >
                      <span>•</span>
                      <div>
                        <strong>{n.title}</strong>
                        <small>{n.message}</small>
                        <time>{new Date(n.created_at).toLocaleString()}</time>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="teacher-notify-empty">
                  ✓<strong>You&apos;re all caught up!</strong>
                  <small>Class activity will appear here.</small>
                </div>
              )}
            </div>
          </div>
          <Link
            prefetch={false}
            className="teacher-user"
            href="/teacher/profile"
          >
            {photo ? (
              <img src={photo} alt="Teacher profile" />
            ) : (
              <span>{avatar(teacher.avatar_key)}</span>
            )}
            <div>
              <strong>{teacher.name}</strong>
              <small>Teacher</small>
            </div>
            ⌄
          </Link>
        </div>
      </header>
      <main className="teacher-main">{children}</main>
    </div>
  );
}
function title(path: string) {
  if (path.includes("/classes") || path.includes("/class/"))
    return path.includes("/class/") ? "Class Overview" : "My Classes";
  if (path.includes("/students")) return "Students";
  if (path.includes("/monitoring") || path.includes("/student/"))
    return "Student Monitoring";
  if (path.includes("/lessons") || path.includes("/lesson/")) return "Lessons";
  if (path.includes("/assignments")) return "Assignments";
  if (path.includes("/reports")) return "Reports";
  if (path.includes("/announcements")) return "Announcements";
  if (path.includes("/profile")) return "Teacher Profile";
  return "Teacher Dashboard";
}
