"use client";
export function SectionArchiveButton({ archived, name, className }: { archived: boolean; name: string; className: string }) {
 return <button className={className} onClick={event => {
 if (!archived && !confirm("Archive " + name + "? Students can still view lessons and records, but new attempts and submissions will close. Existing work has 15 minutes to save progress or a draft. You can restore the section later.")) event.preventDefault();
 }}>{archived ? "Restore" : "Archive"}</button>;
}
