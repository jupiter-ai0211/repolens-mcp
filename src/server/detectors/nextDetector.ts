import type { Detector } from "./types.js";

/** Detects Next.js from the `next` dependency or a next.config.* file. */
export const nextDetector: Detector = (ctx) => {
  const hasConfig =
    ctx.hasFile("next.config.js") ||
    ctx.hasFile("next.config.mjs") ||
    ctx.hasFile("next.config.ts") ||
    ctx.hasFile("next.config.cjs");

  if (ctx.allDependencies.has("next") || hasConfig) {
    return { frameworks: ["Next.js"] };
  }
  return {};
};
