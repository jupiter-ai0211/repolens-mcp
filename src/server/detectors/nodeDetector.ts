import type { Detector } from "./types.js";

/**
 * Detects Node.js language and common JS/TS tooling from package.json and
 * tsconfig presence.
 */
export const nodeDetector: Detector = (ctx) => {
  if (!ctx.packageJson && !ctx.hasFile("package.json")) {
    return {};
  }

  const languages = new Set<string>(["JavaScript"]);
  if (ctx.hasFile("tsconfig.json") || ctx.allDependencies.has("typescript")) {
    languages.add("TypeScript");
  }

  const tooling = new Set<string>();
  const dep = (name: string) => ctx.allDependencies.has(name.toLowerCase());

  if (dep("eslint")) tooling.add("ESLint");
  if (dep("prettier")) tooling.add("Prettier");
  if (dep("vitest")) tooling.add("Vitest");
  if (dep("jest")) tooling.add("Jest");
  if (dep("mocha")) tooling.add("Mocha");
  if (dep("playwright") || dep("@playwright/test")) tooling.add("Playwright");
  if (dep("cypress")) tooling.add("Cypress");
  if (dep("webpack")) tooling.add("webpack");
  if (dep("rollup")) tooling.add("Rollup");
  if (dep("esbuild")) tooling.add("esbuild");
  if (dep("turbo")) tooling.add("Turborepo");

  return {
    languages: [...languages],
    tooling: [...tooling],
  };
};
