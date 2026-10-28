import type { Level } from "@/types/database";

export type PreviewLevel = Pick<Level, "level_number" | "title" | "build_available" | "starter_code_enabled" | "starter_code_locked" | "starter_code_template">;

// Rendered only inside the staff preview iframe. There is no student recording bridge.
export function gamePreviewDocument(level: PreviewLevel, origin: string, version: string) {
  const base = new URL("/game_build/", origin).href;
  const json = (value: unknown) => JSON.stringify(value).replaceAll("<", "\\u003c");
  const asset = (extension: string) => base + "Build/game_build." + extension + "?v=" + encodeURIComponent(version);
  const settings = {
    levelNumber: level.level_number,
    enabled: level.starter_code_enabled,
    allowEditing: level.starter_code_enabled && !level.starter_code_locked,
    template: level.starter_code_template ?? "",
  };
  // The CSP also blocks connections to /api, so preview code cannot submit progress.
  const policy = `default-src 'none'; script-src ${base} 'unsafe-inline' 'wasm-unsafe-eval'; connect-src ${base}; style-src 'unsafe-inline'; img-src ${base} data: blob:; media-src ${base} blob: data:; worker-src blob:; font-src ${base} data:; base-uri 'none'; form-action 'none'`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${policy}">
<title>KnightCode game preview</title>
<style>
html,body{margin:0;width:100%;height:100%;background:#000;color:#fff;font:14px/1.4 system-ui,sans-serif;overflow:hidden}
body{display:flex;flex-direction:column}
/* Match the student player's 1080 x 600 stage in normal and fullscreen views. */
#viewport{flex:1;min-width:0;min-height:0;width:100%;container-type:size;display:grid;place-items:center;overflow:hidden;background:#000}
#stage{position:relative;width:min(100cqw,180cqh);height:min(100cqh,55.555556cqw);aspect-ratio:1080 / 600}
canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
#status{padding:6px 12px;background:#122541;color:#f4f8ff}
input,textarea,button{font-size:16px}
</style></head><body><div id="viewport"><div id="stage"><canvas id="game" aria-label="Playable game preview"></canvas></div></div>
<div id="status" role="status">Loading game preview...</div>
<script>
const status = document.getElementById("status");
const discard = () => Promise.resolve({ok:true});
window.KnightCodeGame = Object.freeze({
  recordAttempt: discard, recordExecution: discard, completeLevel: discard,
  retryPending: () => {}, flush: () => Promise.resolve(true), hasPending: () => false
});
window.KnightCodeStarterCode = ${json(settings)};
const loader = document.createElement("script");
loader.src = ${json(asset("loader.js"))};
loader.onerror = () => { status.textContent = "The preview could not load. Close it and try again."; };
loader.onload = async () => {
  try {
    const game = await createUnityInstance(document.getElementById("game"), {
      dataUrl: ${json(asset("data"))}, frameworkUrl: ${json(asset("framework.js"))},
      codeUrl: ${json(asset("wasm"))}, streamingAssetsUrl: ${json(base + "StreamingAssets")},
      companyName: "DefaultCompany", productName: "KnightCode", productVersion: "1.0",
      devicePixelRatio: window.devicePixelRatio || 1, matchWebGLToCanvasSize: true
    }, progress => { status.textContent = "Loading preview: " + Math.round(progress * 100) + "%"; });
    game.SendMessage("LevelSelectManager", "LoadLevel", ${json(level.level_number)});
    status.textContent = "Preview only. No learning records are saved.";
  } catch (error) { status.textContent = "Preview failed to load: " + String(error); }
};
document.body.appendChild(loader);
</script></body></html>`;
}
