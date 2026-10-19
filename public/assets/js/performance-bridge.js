(function (root) {
  "use strict";
  function createPerformanceBridge(save, sceneName, status, saveExecution) {
    const pending = [];
    let working = false;
    let rejected = 0;
    const run =
      "legacy_" +
      (root.crypto?.randomUUID?.() ||
        Date.now() + "_" + Math.random().toString(36).slice(2));
    let sequence = 0;
    let previous = { attempts: 0, mistakes: 0, time: 0 };
    let totals = { attempts: 0, mistakes: 0, time: 0, lines: 0 };
    const number = (value) => Math.max(0, Math.round(Number(value) || 0));
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    function normalize(completed, source) {
      if (source.telemetry_version === 2) {
        if (String(source.scene_name) !== String(sceneName))
          throw new Error(
            "Game scene does not match this level. Open the matching level page.",
          );
        return { ...source, completed };
      }
      // Legacy builds reset their counters on scene reload. This prevents
      // obvious double additions, but cannot recover data the old game omitted.
      const raw = {
        attempts: number(source.attempts ?? 1),
        mistakes: number(source.mistakes),
        time: number(source.play_time_seconds),
      };
      const reset =
        raw.attempts < previous.attempts ||
        raw.mistakes < previous.mistakes ||
        raw.time < previous.time;
      totals.attempts += reset
        ? Math.max(0, raw.attempts - 1)
        : Math.max(0, raw.attempts - previous.attempts);
      totals.mistakes += reset
        ? raw.mistakes
        : Math.max(0, raw.mistakes - previous.mistakes);
      totals.time += reset ? raw.time : Math.max(0, raw.time - previous.time);
      if (completed) totals.lines += number(source.lines_used);
      previous = raw;
      return {
        telemetry_version: 1,
        run_id: run,
        sequence: ++sequence,
        scene_name: String(sceneName),
        completed,
        attempts: Math.max(1, totals.attempts),
        mistakes: totals.mistakes,
        play_time_seconds: raw.time,
        total_play_time_seconds: totals.time,
        lines_used: totals.lines,
        completed_lines: 0,
      };
    }

    async function drain() {
      if (working) return;
      working = true;
      try {
        while (pending.length) {
          const item = pending[0];
          let saved = false;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              status("Saving progress…");
              const result =
                item.kind === "execution"
                  ? await saveExecution(item.body)
                  : await save(item.body.completed, item.body);
              pending.shift();
              item.resolve(result);
              status(
                rejected ? "Latest save succeeded, but " + rejected + " earlier record(s) were rejected. Reload after updating the app if this continues." :
                item.kind === "execution"
                  ? "Run history saved"
                  : item.body.telemetry_version === 2
                    ? "Progress saved"
                    : "Progress saved — older build; detailed metrics are incomplete",
              );
              saved = true;
              break;
            } catch (error) {
              // Invalid records cannot be repaired by retrying the same bytes.
              // Keep auth/network/server errors queued; let later cumulative
              // snapshots recover progress after a permanently invalid record.
              if (error.code === "SECTION_ARCHIVED" || [400, 413, 422].includes(error.status)) {
                pending.shift();
                rejected++;
                item.reject(error);
                status("A game record was rejected: " + error.message + ". Later saves will still be attempted.");
                saved = true;
                break;
              }
              if (attempt === 2) {
                status(
                  "Progress not saved. Keep this page open and press Retry saving.",
                );
                return; // Keep this exact sequence for an idempotent retry.
              }
              await sleep(500 * (attempt + 1));
            }
          }
          if (!saved) return;
        }
      } finally {
        working = false;
      }
    }

    function enqueue(completed, payload = {}) {
      let body;
      try {
        body = normalize(completed, payload);
      } catch (error) {
        status(error.message);
        return Promise.reject(error);
      }
      return new Promise((resolve, reject) => {
        pending.push({ kind: "progress", body, resolve, reject });
        drain();
      });
    }
    function recordExecution(body) {
      if (String(body.scene_name) !== String(sceneName))
        return Promise.reject(
          new Error("Run history scene does not match this level."),
        );
      return new Promise((resolve, reject) => {
        pending.push({ kind: "execution", body, resolve, reject });
        drain();
      });
    }
    return {
      recordExecution,
      completeLevel: (payload) => enqueue(true, payload),
      recordAttempt: (payload) => enqueue(false, payload),
      retryPending: drain,
      flush: async () => {
        if (!working) void drain();
        while (working) await sleep(25);
        return pending.length === 0;
      },
      hasPending: () => pending.length > 0,
    };
  }
  root.createPerformanceBridge = createPerformanceBridge;
  if (typeof module !== "undefined")
    module.exports = { createPerformanceBridge };
})(typeof window !== "undefined" ? window : globalThis);
