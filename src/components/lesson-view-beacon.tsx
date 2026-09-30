"use client";
import { useEffect } from "react";
export function LessonViewBeacon({ lessonId }: { lessonId: number }) {
  useEffect(() => {
    fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionType: "lesson_viewed", lessonId }),
    }).catch(() => undefined);
  }, [lessonId]);
  return null;
}
