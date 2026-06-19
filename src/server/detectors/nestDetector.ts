import type { Detector } from "./types.js";

/** Detects NestJS from @nestjs/* dependencies or a nest-cli.json file. */
export const nestDetector: Detector = (ctx) => {
  const hasNestDep = [...ctx.allDependencies].some((dep) =>
    dep.startsWith("@nestjs/"),
  );
  if (hasNestDep || ctx.hasFile("nest-cli.json")) {
    return { frameworks: ["NestJS"] };
  }
  return {};
};
