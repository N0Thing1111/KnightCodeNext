"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSectionArchive } from "@/lib/use-section-archive";
import { attachUnityMobileKeyboard } from "@/lib/unity-mobile-keyboard";
import styles from "@/components/unity-player.module.css";
import type { Level, LevelProgress } from "@/types/database";
import { formatDuration, formatLevelTime } from "@/lib/format";

export function UnityPlayer({
  level,
  initial,
}: {
  level: Level;
  initial: LevelProgress | null;
}) {
  const shell = useRef<HTMLElement>(null);
  const archived = useSectionArchive();
  const closeForArchive = useRef<(() => Promise<void>) | null>(null);
  const archiveRejected = useRef(false);
  useEffect(() => { if (archived) void closeForArchive.current?.(); }, [archived]);
  const [fullscreen, setFullscreen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [viewMessage, setViewMessage] = useState("");

  useEffect(() => {
    const changed = () => setFullscreen((document.fullscreenElement === shell.current || document.fullscreenElement === document.documentElement));
    document.addEventListener("fullscreenchange", changed);
    return () => {
      document.removeEventListener("fullscreenchange", changed);
      if (document.fullscreenElement === document.documentElement) {
        void document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (!shell.current) return;
    return attachUnityMobileKeyboard(shell.current, styles.mobileKeyboard);
  }, []);

  async function toggleFullscreen() {
    if ((document.fullscreenElement === shell.current || document.fullscreenElement === document.documentElement)) {
      try { await document.exitFullscreen(); } catch { setViewMessage("Use your browser's fullscreen exit control to return."); }
      return;
    }
    if (expanded) { setExpanded(false); setViewMessage(""); return; }
    setShowDetails(false);
    setViewMessage("");
    try {
      if (!document.documentElement.requestFullscreen) throw Error("Fullscreen unavailable");
      // Unity creates its mobile input under body before focusing it. The whole
      // document must be in fullscreen so that initial focus is permitted.
      await document.documentElement.requestFullscreen();
    } catch {
      setExpanded(true);
      setViewMessage("Game expanded to fit this browser window. Browser fullscreen is unavailable here.");
    }
  }

  async function toggleDetails() {
    if ((document.fullscreenElement === shell.current || document.fullscreenElement === document.documentElement)) {
      try { await document.exitFullscreen(); } catch { setViewMessage("Exit fullscreen first to view the level details."); return; }
    }
    setExpanded(false);
    setViewMessage("");
    setShowDetails(value => !value);
  }

  const [status, setStatus] = useState("Loading game…");
  const [levelStats, setLevelStats] = useState(initial);
  const [session, setSession] = useState<Record<
    string,
    number | boolean | null
  > | null>(null);

  useLayoutEffect(() => {
    let disposed = false;
    let instance: Awaited<
      ReturnType<NonNullable<Window["createUnityInstance"]>>
    > | null = null;
    let loader: HTMLScriptElement | null = null;
    const scriptsBefore = new Set(document.scripts);
    let shutdownPromise: Promise<void> | null = null;

    window.KnightCodeStarterCode = {
      levelNumber: level.level_number,
      enabled: level.starter_code_enabled,
      allowEditing: level.starter_code_enabled && !level.starter_code_locked,
      template: level.starter_code_template ?? "",
    };

    const bridge = document.createElement("script");
    bridge.src = "/assets/js/performance-bridge.js?v=20261019-section-archive";
    bridge.async = true;
    bridge.dataset.knightcodeRuntime = "bridge";

    bridge.onload = () => {
      if (disposed || !window.createPerformanceBridge) return;
      const save = async (
        completed: boolean,
        payload: Record<string, unknown>,
      ) => {
        const response = await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, level_id: level.id, completed }),
          keepalive: true,
        });
        const data = await response.json();
        if (data.code === "SECTION_ARCHIVED") { archiveRejected.current = true; window.dispatchEvent(new Event("knightcode:section-archived")); }
        if (!response.ok || !data.ok)
          throw Object.assign(new Error(data.message || "Unable to save progress."), { status: response.status, code: data.code });
        if (!disposed) {
          setLevelStats(data.level);
          setSession(data.session);
        }
        return data;
      };

      window.KnightCodeGame = window.createPerformanceBridge(
        save,
        level.level_number,
        (message) => {
          if (!disposed) setStatus(message);
        },
        async (payload) => {
          const body = JSON.stringify({ ...payload, level_id: level.id });
          const response = await fetch("/api/executions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            // Browsers limit keepalive requests to about 64 KB.
            keepalive: new TextEncoder().encode(body).byteLength < 60000,
          });
          const data = await response.json();
        if (data.code === "SECTION_ARCHIVED") { archiveRejected.current = true; window.dispatchEvent(new Event("knightcode:section-archived")); }
          if (!response.ok || !data.ok)
            throw Object.assign(new Error(data.message || "Unable to save Run history."), { status: response.status, code: data.code });
          return data;
        },
      );

      loader = document.createElement("script");
      loader.src =
        "/game_build/Build/game_build.loader.js?v=20261015-mobile-starter-caret";
      loader.async = true;
      loader.dataset.knightcodeRuntime = "loader";
      loader.onload = async () => {
        const canvas =
          document.querySelector<HTMLCanvasElement>("#unity-canvas");
        if (disposed || !canvas || !window.createUnityInstance) return;
        try {
          const created = await window.createUnityInstance(
            canvas,
            {
              dataUrl:
                "/game_build/Build/game_build.data?v=20261015-mobile-starter-caret",
              frameworkUrl:
                "/game_build/Build/game_build.framework.js?v=20261015-mobile-starter-caret",
              codeUrl:
                "/game_build/Build/game_build.wasm?v=20261015-mobile-starter-caret",
              streamingAssetsUrl: "/game_build/StreamingAssets",
              companyName: "DefaultCompany",
              productName: "KnightCode",
              productVersion: "1.0",
              devicePixelRatio: window.devicePixelRatio || 1,
              matchWebGLToCanvasSize: true,
            },
            () => undefined,
          );
          if (disposed) {
            await created.Quit?.();
            return;
          }
          instance = created;
          window.unityInstance = created;
          setStatus("Game loaded. Progress saves automatically.");
          created.SendMessage(
            "LevelSelectManager",
            "LoadLevel",
            level.level_number,
          );
        } catch (error) {
          if (!disposed) setStatus("Game failed to load: " + String(error));
        }
      };
      document.body.appendChild(loader);
    };
    document.body.appendChild(bridge);

    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (window.KnightCodeGame?.hasPending()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    const shutdown = () => {
      if (shutdownPromise) return shutdownPromise;
      disposed = true;
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", leaveGamePage, true);
      if (window.unityInstance === instance) window.unityInstance = undefined;
      window.KnightCodeGame = undefined;
      window.KnightCodeStarterCode = undefined;
      bridge.remove();
      loader?.remove();
      const activeInstance = instance;
      instance = null;
      shutdownPromise = (activeInstance?.Quit?.() ?? Promise.resolve())
        .catch(() => undefined)
        .then(() => {
          for (const script of Array.from(document.scripts)) {
            if (
              !scriptsBefore.has(script) &&
              (script.dataset.knightcodeRuntime ||
                script.src.includes("/game_build/Build/"))
            )
              script.remove();
          }
        });
      return shutdownPromise;
    };

    closeForArchive.current = async () => {
      if (document.activeElement instanceof HTMLElement && shell.current?.contains(document.activeElement)) document.activeElement.blur();
      setStatus("Section archived. Saving existing progress before closing the game...");
      const saved = await Promise.race([window.KnightCodeGame?.flush() ?? Promise.resolve(true), new Promise<boolean>(resolve => setTimeout(() => resolve(false), 10000))]);
      if (!saved) { setStatus("Section archived. Some progress is still waiting to save. Use Retry saving; existing work has a 15-minute save window."); return; }
      await shutdown();
      setStatus(archiveRejected.current ? "Section archived. New or late records were rejected; previously saved progress is preserved." : "Section archived. Pending progress saved. Return to your lesson to view your records.");
    };
    const leaveGamePage = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !target ||
        target.target === "_blank" ||
        target.hasAttribute("download")
      )
        return;
      const destination = new URL(target.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.href === window.location.href
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setStatus("Closing game safely…");
      void (async () => {
        const saved = await Promise.race([
          window.KnightCodeGame?.flush() ?? Promise.resolve(true),
          new Promise<boolean>((resolve) =>
            window.setTimeout(() => resolve(false), 10000),
          ),
        ]);
        if (!saved) {
          setStatus(
            "Progress is still waiting to save. Keep this page open, use Retry saving, then try leaving again.",
          );
          return;
        }
        await Promise.race([
          shutdown(),
          new Promise<void>((resolve) => window.setTimeout(resolve, 3000)),
        ]);
        window.location.assign(destination.href);
      })();
    };

    document.addEventListener("click", leaveGamePage, true);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      closeForArchive.current = null;
      void shutdown();
    };
  }, [level]);

  return (
    <>
      <section
        ref={shell}
        className={"game-shell " + styles.shell}
        data-view={showDetails ? "details" : "game"}
        data-expanded={expanded || fullscreen}
        aria-label="KnightCode game area"
        onKeyDown={event => { if (event.key === "Escape" && expanded) { setExpanded(false); setViewMessage(""); } }}
      >
        <div className={"game-toolbar " + styles.toolbar}>
          <div className={styles.title}>
            <a href={"/lesson/" + level.lesson_id}>Back to lesson</a>
            <strong>Level {level.level_number} · {level.title}</strong>
          </div>
          <div className={styles.controls}>
            <button type="button" className={styles.detailsToggle} onClick={() => void toggleDetails()}>{showDetails ? "Back to game" : "Level details"}</button>
            <button type="button" onClick={() => void toggleFullscreen()} aria-pressed={fullscreen || expanded}>{fullscreen ? "Exit fullscreen" : expanded ? "Exit expanded view" : "Fullscreen"}</button>
          </div>
        </div>
        {viewMessage && <p className={styles.viewMessage} role="status">{viewMessage}</p>}
        {archived && <p className={styles.viewMessage} role="status">This section is archived. New attempts are closed. Return to your lesson after saving; reload after the section is restored.</p>}
        <div className={styles.viewport} style={archived ? { pointerEvents: "none", visibility: "hidden" } : undefined}>
        <div className={"game-stage " + styles.stage} id="unity-container">
          <canvas
            id="unity-canvas"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              background: "#000",
              display: "block",
            }}
          />
        </div>
        <div className={styles.rotate}>
          <span className={styles.rotateIcon} aria-hidden="true">↻</span>
          <h2>Turn your phone sideways</h2>
          <p>Landscape gives the puzzle and code editor more room. Rotate your phone to play, or open Level details above.</p>
        </div>
        </div>
        <div className={"game-statusbar " + styles.statusbar}>
          <span role="status">{status}</span>
          <button
            type="button"
            onClick={() => archived ? void closeForArchive.current?.() : window.KnightCodeGame?.retryPending()}
          >
            Retry saving
          </button>
        </div>
      </section>
      <section className="play-bottom-grid">
        <article className="panel">
          <div className="panel-title-row">
            <div>
              <span className="panel-kicker">LEVEL DATA</span>
              <h2>Your Level Stats</h2>
            </div>
          </div>
          <div className="mini-stat-grid">
            <div>
              <span>Attempts</span>
              <b>{levelStats?.attempts ?? 0}</b>
            </div>
            <div>
              <span>Mistakes</span>
              <b>{levelStats?.mistakes ?? 0}</b>
            </div>
            <div>
              <span>Play Time</span>
              <b>{formatDuration(levelStats?.play_time_seconds ?? 0)}</b>
            </div>
            <div>
              <span>XP Earned</span>
              <b>{levelStats?.xp_earned ?? 0}</b>
            </div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-title-row">
            <div>
              <span className="panel-kicker">LEARNING LOOP</span>
              <h2>Game → Progress → Mastery</h2>
            </div>
          </div>
          <p className="panel-note-large">
            When the game reports a completion, KnightCode stores the attempt,
            mistakes, play time, and XP for this student.
          </p>
          <div className="integration-flow">
            <span>Game</span>
            <i>→</i>
            <span>Activity</span>
            <i>→</i>
            <span>XP</span>
            <i>→</i>
            <span>Progress</span>
            <i>→</i>
            <span>Badges</span>
          </div>
        </article>
      </section>
      <section className="panel">
        <div className="panel-title-row">
          <h2>This Session</h2>
        </div>
        <p className="panel-note-large">
          Pause restarts count within this session. Victory replay starts a
          fresh session. Completed sessions are saved for your teacher.
        </p>
        <div className="summary-stat-grid">
          <div>
            <small>Status</small>
            <strong>
              {session
                ? session.completed
                  ? "Completed — saved"
                  : "In progress"
                : "Waiting for game"}
            </strong>
          </div>
          <div>
            <small>Attempts</small>
            <strong>{session?.attempts ?? "—"}</strong>
          </div>
          <div>
            <small>Mistakes</small>
            <strong>{session?.mistakes ?? "—"}</strong>
          </div>
          <div>
            <small>Time</small>
            <strong>
              {session
                ? formatLevelTime(Number(session.play_time_seconds))
                : "—"}
            </strong>
          </div>
          <div>
            <small>Lines Submitted</small>
            <strong>{session?.lines_used ?? "—"}</strong>
          </div>
          <div>
            <small>Winning Attempt Lines</small>
            <strong>{session?.completed_lines ?? "—"}</strong>
          </div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-title-row">
          <div>
            <span className="panel-kicker">LEVEL PERFORMANCE</span>
            <h2>Lifetime Level Performance</h2>
          </div>
        </div>
        {levelStats?.attempts ? (
          <div className="summary-stat-grid">
            <div>
              <small>Total Play Time</small>
              <strong>{formatLevelTime(levelStats.play_time_seconds)}</strong>
            </div>
            <div>
              <small>Total Lines Submitted</small>
              <strong>{levelStats.lines_used ?? "—"}</strong>
            </div>
            <div>
              <small>Best Completion Time</small>
              <strong>{formatLevelTime(levelStats.best_time_seconds)}</strong>
            </div>
            <div>
              <small>Fewest Lines Used</small>
              <strong>{levelStats.best_lines_used ?? "—"}</strong>
            </div>
            <div>
              <small>Total Attempts</small>
              <strong>{levelStats.attempts}</strong>
            </div>
            <div>
              <small>Total Mistakes</small>
              <strong>{levelStats.mistakes}</strong>
            </div>
            <div>
              <small>Status</small>
              <strong>
                {levelStats.completed ? "Completed" : "In Progress"}
              </strong>
            </div>
            <div>
              <small>XP Earned</small>
              <strong>{levelStats.xp_earned}</strong>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            Play this level once to see your personal performance summary here.
          </div>
        )}
      </section>
    </>
  );
}
