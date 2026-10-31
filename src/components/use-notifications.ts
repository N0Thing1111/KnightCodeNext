"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Refresh on navigation, opening the bell, and returning to the tab.
// No periodic polling is needed for these occasional alerts.
export function useNotifications<T>(initial: T[], endpoint: string, pathname: string) {
  const [items, setItems] = useState(initial);
  const request = useRef(0);
  const refreshNotifications = useCallback(async () => {
    const version = ++request.current;
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (version === request.current && Array.isArray(data.notifications)) setItems(data.notifications);
    } catch { /* Keep the last known notifications while offline. */ }
  }, [endpoint]);
  const invalidate = useCallback(() => { ++request.current; }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void refreshNotifications(), 0);
    const refresh = () => { if (document.visibilityState === "visible") void refreshNotifications(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(timer);
      invalidate();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [pathname, refreshNotifications, invalidate]);
  return { items, setItems, refreshNotifications };
}
