(function (root) {
  "use strict";
  function createPerformanceBridge(save, sceneName, status) {
    const pending = [];
    let working = false;
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
              const result = await save(item.body.completed, item.body);
              pending.shift();
              item.resolve(result);
              status(
                item.body.telemetry_version === 2
                  ? "Progress saved"
                  : "Progress saved — older build; detailed metrics are incomplete",
              );
              saved = true;
              break;
            } catch (error) {
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
      return new Promise((resolve) => {
        pending.push({ body, resolve });
        drain();
      });
    }
    return {
      completeLevel: (payload) => enqueue(true, payload),
      recordAttempt: (payload) => enqueue(false, payload),
      retryPending: drain,
      hasPending: () => pending.length > 0,
    };
  }
  root.createPerformanceBridge = createPerformanceBridge;
  if (typeof module !== "undefined")
    module.exports = { createPerformanceBridge };
})(typeof window !== "undefined" ? window : globalThis);
