"use client";
import { useEffect, useState } from "react";
export function useSectionArchive() {
 const [archived, setArchived] = useState(false);
 useEffect(() => {
 let disposed = false;
 const close = () => setArchived(true);
 const check = async () => {
 try {
 const response = await fetch("/api/section-status", { cache: "no-store" });
 if (!response.ok) return;
 const data = await response.json();
 if (!disposed && data.archived) setArchived(true);
 } catch { /* Database write guards still enforce closure while offline. */ }
 };
 void check(); const timer = setInterval(check, 30000);
 window.addEventListener("focus", check); window.addEventListener("knightcode:section-archived", close);
 return () => { disposed = true; clearInterval(timer); window.removeEventListener("focus", check); window.removeEventListener("knightcode:section-archived", close); };
 }, []);
 return archived;
}
