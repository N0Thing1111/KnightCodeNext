"use client";

import { useState } from "react";

export function ThemeControls({ initial }: { initial: "light" | "dark" }) {
  const [theme, setTheme] = useState(initial);
  const [status, setStatus] = useState(
    "Theme preference is saved to your account.",
  );

  async function choose(next: "light" | "dark") {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("knightcode-theme", next);
    setStatus("Saving theme preference…");
    const response = await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next }),
    });
    setStatus(
      response.ok
        ? "Theme preference is saved to your account."
        : "Theme changed for this session. Account save failed.",
    );
  }

  return (
    <>
      <input type="hidden" name="theme_preference" value={theme} />
      <div
        className="theme-switcher"
        role="group"
        aria-label="Theme preference"
      >
        <button
          type="button"
          className={`theme-choice ${theme === "dark" ? "active" : ""}`}
          onClick={() => choose("dark")}
        >
          <span>☾</span>
          <b>Dark</b>
          <small>Deep navy + neon accents</small>
        </button>
        <button
          type="button"
          className={`theme-choice ${theme === "light" ? "active" : ""}`}
          onClick={() => choose("light")}
        >
          <span>☀</span>
          <b>Light</b>
          <small>Bright workspace + soft cards</small>
        </button>
      </div>
      <p className="theme-save-status" aria-live="polite">
        {status}
      </p>
    </>
  );
}
