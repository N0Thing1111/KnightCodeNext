"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export function AdminRecordActions({ name, children }: { name: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();

  useEffect(() => {
    const modal = dialog.current;
    if (!modal) return;
    if (!open) { modal.close(); return; }
    modal.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { modal.close(); document.body.style.overflow = overflow; };
  }, [open]);

  return <>
    <button type="button" className="teacher-btn" aria-label={"More actions for " + name} aria-haspopup="dialog" onClick={() => setOpen(true)}>More</button>
    <dialog ref={dialog} className="admin-record-dialog" aria-labelledby={heading} onCancel={() => setOpen(false)}>
      {open && <>
        <header className="admin-record-dialog-head">
          <h2 id={heading}>Actions for {name}</h2>
          <button type="button" className="teacher-btn" autoFocus onClick={() => setOpen(false)}>Close</button>
        </header>
        <div className="admin-dialog-actions">{children}</div>
      </>}
    </dialog>
  </>;
}
