"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isGameLevelAvailable } from "@/lib/game-build";
import { gamePreviewDocument, type PreviewLevel } from "@/lib/game-preview-document";
import styles from "./game-preview.module.css";

export function GamePreviewButton({ level }: { level: PreviewLevel }) {
  const [open, setOpen] = useState(false);
  if (!isGameLevelAvailable(level)) return <span className="teacher-note">Coming Soon</span>;
  return <>
    <button type="button" className="teacher-btn" onClick={() => setOpen(true)} aria-label={`Preview game: Level ${level.level_number}, ${level.title}`}>Preview game</button>
    {open && createPortal(<GamePreview level={level} onClose={() => setOpen(false)} />, document.body)}
  </>;
}

function GamePreview({ level, onClose }: { level: PreviewLevel; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const heading = useId();
  const description = useId();
  const [message, setMessage] = useState("");
  const [source] = useState(() => gamePreviewDocument(level, window.location.origin, process.env.NEXT_PUBLIC_UNITY_BUILD_VERSION || ""));
  useEffect(() => {
    const modal = dialog.current!;
    modal.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { modal.close(); document.body.style.overflow = overflow; };
  }, []);

  async function fullscreen() {
    try { await frame.current?.requestFullscreen(); }
    catch { setMessage("Fullscreen is unavailable in this browser. You can play in this window."); }
  }
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={heading} aria-describedby={description} onCancel={onClose}>
    <div className={styles.content}>
      <header className={styles.header}>
        <div><h2 id={heading}>Level {level.level_number}: {level.title}</h2>
          <p id={description}>Game preview. Code, attempts, time, XP and completion are not saved.</p></div>
        <div className={styles.actions}>
          <button type="button" className="teacher-btn" onClick={() => void fullscreen()}>Fullscreen</button>
          <button type="button" className="teacher-btn" onClick={onClose} autoFocus>Close preview</button>
        </div>
      </header>
      {message && <p className={styles.message} role="status">{message}</p>}
      <iframe ref={frame} className={styles.frame} title={`Level ${level.level_number} game preview`} srcDoc={source} sandbox="allow-scripts allow-same-origin allow-pointer-lock" allow="fullscreen; autoplay" allowFullScreen />
    </div>
  </dialog>;
}
