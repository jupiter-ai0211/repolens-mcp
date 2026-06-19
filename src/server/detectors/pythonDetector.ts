import type { Detector } from "./types.js";

/**
 * Detects Python and common Python frameworks from sentinel files.
 */
export const pythonDetector: Detector = (ctx) => {
  const isPython =
    ctx.hasFile("requirements.txt") ||
    ctx.hasFile("pyproject.toml") ||
    ctx.hasFile("setup.py") ||
    ctx.hasFile("Pipfile") ||
    ctx.hasFile("manage.py");

  if (!isPython) {
    return {};
  }

  const frameworks: string[] = [];
  if (ctx.hasFile("manage.py")) {
    frameworks.push("Django");
  }

  const tooling: string[] = [];
  if (ctx.hasFile("pyproject.toml")) {
    tooling.push("Poetry/PEP 621");
  }
  if (ctx.hasFile("Pipfile")) {
    tooling.push("Pipenv");
  }

  return { languages: ["Python"], frameworks, tooling };
};
