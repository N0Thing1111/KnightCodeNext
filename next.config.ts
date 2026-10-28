import type { NextConfig } from "next";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

// Recomputed at startup/build time: replacing the Unity export changes all asset URLs together.
const unityBuildHash = createHash("sha256");
for (const extension of ["loader.js", "framework.js", "data", "wasm"]) {
  unityBuildHash.update(readFileSync(path.join(process.cwd(), "public/game_build/Build", `game_build.${extension}`)));
}
const unityBuildVersion = unityBuildHash.digest("hex").slice(0, 16);

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_UNITY_BUILD_VERSION: unityBuildVersion },
  // Separate build output allows verification without replacing a running dev build.
  distDir: process.env.KC_BUILD_DIR || ".next",
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  outputFileTracingIncludes: {
    "/api/teacher/reports": ["./public/fonts/reports/*.ttf"],
  },
  async headers() {
    return [
      {
        source: "/python/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
      {
        source: "/lesson/:id/python",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
      {
        source: "/python/runtime-worker.js",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'none'; script-src https://cdn.jsdelivr.net 'wasm-unsafe-eval'; connect-src https://cdn.jsdelivr.net; worker-src 'none'",
          },
          { key: "Cache-Control", value: "no-store" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
      {
        source: "/game_build/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
};

export default nextConfig;
