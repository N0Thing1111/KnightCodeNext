"use client";
import { useFormStatus } from "react-dom";
export function SectionDeleteButton({ name }: { name: string }) {
  const { pending } = useFormStatus();
  return <button className="teacher-btn small danger" disabled={pending} onClick={event => {
    if (!confirm('Permanently delete "' + name + '"? Only unused sections can be deleted. Students, assignments, announcements, enrollment requests, or other connected records will block deletion. Archive a used section instead.')) event.preventDefault();
  }}>{pending ? "Deleting..." : "Delete unused section"}</button>;
}
