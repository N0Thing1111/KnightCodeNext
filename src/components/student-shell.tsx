"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Notification, Profile } from "@/types/database";

const avatars: Record<string, string> = {
  knight: "♞",
  blue: "🛡️",
  mage: "🧙",
  fox: "🦊",
  dragon: "🐉",
  robot: "🤖",
};

function avatarUrl(path: string | null) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-images/${path}`;
}

export function StudentShell({
  student,
  stats,
  notifications,
  children,
}: {
  student: Profile;
  stats: {
    level: number;
    rank: string;
    xp: number;
    xpPct: number;
    streak: number;
  };
  notifications: Notification[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const unread = useMemo(
    () => items.filter((item) => !item.is_read).length,
    [items],
  );
  const photo = avatarUrl(student.profile_image);

  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setCollapsed(
        localStorage.getItem("knightcode-sidebar-collapsed") === "1",
      ),
    );
    document.documentElement.dataset.theme = student.theme_preference;
    document.body.classList.add("kc-student-body");
    return () => {
      cancelAnimationFrame(frame);
      document.body.classList.remove("kc-student-body", "sidebar-collapsed");
    };
  }, [student.theme_preference]);

  useEffect(() => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
  }, [collapsed]);

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("knightcode-sidebar-collapsed", next ? "1" : "0");
  };

  const markRead = async (id?: number) => {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id ?? null }),
    });
    if (!response.ok) return;
    setItems((current) =>
      current.map((item) =>
        !id || item.id === id ? { ...item, is_read: true } : item,
      ),
    );
  };

  const links = [
    ["/dashboard", "⌂", "Dashboard"],
    ["/join", "", "Your class"],
    ["/lessons", "▤", "Lessons"],
    ["/assignments", "✓", "My Assignments"],
    ["/lessons#levels", "⚔", "Challenges"],
    ["/progress", "◔", "My Progress"],
    ["/profile#achievements", "✦", "Achievements"],
  ];
  const active = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/lessons")
      return pathname === "/lessons" || pathname.startsWith("/lesson/");
    if (href === "/lessons#levels") return pathname.startsWith("/play/");
    if (href === "/profile#achievements") return false;
    return pathname === href;
  };

  return (
    <div className={`kc-app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div
        className="sidebar-overlay"
        hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      />
      <aside
        className={`kc-sidebar ${mobileOpen ? "mobile-open" : ""}`}
        id="kcSidebar"
        aria-label="Primary navigation"
      >
        <div className="sidebar-brand">
          <Link
            href="/dashboard"
            className="brand-lockup"
            aria-label="KnightCode dashboard"
          >
            <span className="brand-mark">
              <img src="/assets/img/knight-logo.png" alt="" />
            </span>
            <span className="brand-copy">
              <strong>
                Knight<span>Code</span>
              </strong>
              <small>Code. Learn. Conquer.</small>
            </span>
          </Link>
          <button
            className="sidebar-collapse"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <span className="nav-section-label">Workspace</span>
          {links.map(([href, icon, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`sidebar-link ${active(href) ? "active" : ""}`}
            >
              <span className="nav-icon">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <section
          className="sidebar-progress-card"
          aria-label="Current level progress"
        >
          <div className="sidebar-progress-head">
            <span>Current level</span>
            <strong>{stats.level}</strong>
          </div>
          <div className="progress-track progress-track-dark">
            <span style={{ width: `${stats.xpPct}%` }} />
          </div>
          <div className="sidebar-progress-meta">
            <span>{stats.xp.toLocaleString()} XP</span>
            <span>{stats.xpPct}%</span>
          </div>
          <div className="sidebar-streak">
            <span>🔥</span>
            <div>
              <strong>
                {stats.streak} day{stats.streak === 1 ? "" : "s"}
              </strong>
              <small>learning streak</small>
            </div>
          </div>
        </section>
        <Link href="/profile" className="sidebar-profile">
          {photo ? (
            <span className="avatar avatar-md avatar-image">
              <img src={photo} alt={`${student.name} profile`} />
            </span>
          ) : (
            <span className="avatar avatar-md">
              {avatars[student.avatar_key] ?? "♞"}
            </span>
          )}
          <span>
            <strong>{student.name}</strong>
            <small>{stats.rank}</small>
          </span>
          <b>›</b>
        </Link>
      </aside>
      <header className="kc-utilitybar">
        <div className="utility-left">
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Open navigation"
          >
            ☰
          </button>
          <div className="utility-heading">
            <span className="utility-kicker">KNIGHTCODE</span>
            <h1>{pageTitle(pathname)}</h1>
          </div>
        </div>
        <div className="utility-actions">
          <div className="streak-pill">
            <span>🔥</span>
            <strong>{stats.streak}</strong>
            <small>day{stats.streak === 1 ? "" : "s"}</small>
          </div>
          <div className="notification-wrap">
            <button
              className={`icon-btn notification-trigger ${unread ? "has-unread" : ""}`}
              onClick={() => setNoticeOpen(!noticeOpen)}
              aria-label="Notifications"
              aria-expanded={noticeOpen}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
              <i />
              <b>{unread > 9 ? "9+" : unread}</b>
            </button>
            <div className="notification-panel" hidden={!noticeOpen}>
              <div className="notification-head">
                <div>
                  <strong>Notifications</strong>
                  <small>{unread ? `${unread} unread` : "All caught up"}</small>
                </div>
                <button
                  type="button"
                  disabled={!unread}
                  onClick={() => markRead()}
                >
                  Mark all read
                </button>
              </div>
              <div className="notification-list">
                {items.length ? (
                  items.map((notice) => (
                    <Link
                      key={notice.id}
                      href={notice.link || "#"}
                      className={`notification-item ${notice.is_read ? "" : "unread"}`}
                      onClick={() => markRead(notice.id)}
                      onNavigate={(event) => {
                        if (
                          notice.link &&
                          (/^\/lesson\/\d+\/python(?:[?#]|$)/.test(
                            notice.link,
                          ) ||
                            notice.link.startsWith("/activities?run="))
                        ) {
                          event.preventDefault();
                          window.location.assign(notice.link);
                        }
                      }}
                    >
                      <span className={`notification-type ${notice.type}`}>
                        {notice.type === "achievement"
                          ? "✦"
                          : notice.type === "streak"
                            ? "🔥"
                            : "⚔"}
                      </span>
                      <span className="notification-copy">
                        <strong>{notice.title}</strong>
                        <small>{notice.message}</small>
                        <time>
                          {new Date(notice.created_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
                        </time>
                      </span>
                      {!notice.is_read && <em aria-label="Unread" />}
                    </Link>
                  ))
                ) : (
                  <div className="notification-empty">
                    <span>✓</span>
                    <strong>You&apos;re all caught up</strong>
                    <p>No new reminders right now.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <Link className="profile-mini" href="/profile">
            {photo ? (
              <span className="avatar avatar-sm avatar-image">
                <img src={photo} alt="Profile" />
              </span>
            ) : (
              <span className="avatar avatar-sm">
                {avatars[student.avatar_key] ?? "♞"}
              </span>
            )}
            <span className="profile-copy">
              <strong>{student.name}</strong>
              <small>{stats.rank}</small>
            </span>
            <span className="chevron">⌄</span>
          </Link>
        </div>
      </header>
      <div className="kc-content-wrap">{children}</div>
      <footer className="kc-footer">
        <span>
          © {new Date().getFullYear()} KnightCode · Code. Learn. Conquer.
        </span>
        <Link href="/support">Contact & Support</Link>
      </footer>
    </div>
  );
}

function pageTitle(path: string) {
  if (path.startsWith("/lessons")) return "Lessons";
  if (path.startsWith("/lesson/")) return "Lesson";
  if (path.startsWith("/assignments")) return "My Assignments";
  if (path.startsWith("/progress")) return "My Progress";
  if (path.startsWith("/support")) return "Contact & Support";
  if (path.startsWith("/join")) return "Your class";
  if (path.startsWith("/profile")) return "Profile";
  if (path.startsWith("/play/")) return "Challenge";
  return "Dashboard";
}
