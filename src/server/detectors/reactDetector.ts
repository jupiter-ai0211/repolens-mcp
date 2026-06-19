import type { Detector } from "./types.js";

/** Detects React (and React Native) from dependencies. */
export const reactDetector: Detector = (ctx) => {
  const frameworks: string[] = [];
  if (ctx.allDependencies.has("react")) {
    frameworks.push("React");
  }
  if (ctx.allDependencies.has("react-native")) {
    frameworks.push("React Native");
  }
  return { frameworks };
};
