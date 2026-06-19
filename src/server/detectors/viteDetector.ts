import type { Detector } from "./types.js";

/** Detects Vite from the `vite` dependency or a vite.config.* file. */
export const viteDetector: Detector = (ctx) => {
  const hasConfig =
    ctx.hasFile("vite.config.js") ||
    ctx.hasFile("vite.config.mjs") ||
    ctx.hasFile("vite.config.ts") ||
    ctx.hasFile("vite.config.cjs");

  if (ctx.allDependencies.has("vite") || hasConfig) {
    return { frameworks: ["Vite"] };
  }
  return {};
};
