import { readJsonFile } from "../core/readJson.js";
import type { Detector } from "./types.js";

interface ComposerJson {
  require?: Record<string, string>;
  "require-dev"?: Record<string, string>;
}

/**
 * Detects PHP / Laravel from composer.json and the artisan CLI entrypoint.
 */
export const laravelDetector: Detector = (ctx) => {
  const hasComposer = ctx.hasFile("composer.json");
  const hasArtisan = ctx.hasFile("artisan");

  if (!hasComposer && !hasArtisan) {
    return {};
  }

  const languages = ["PHP"];
  const frameworks: string[] = [];

  const composer = readJsonFile<ComposerJson>(ctx.root, "composer.json");
  const requires = {
    ...(composer.data?.require ?? {}),
    ...(composer.data?.["require-dev"] ?? {}),
  };
  const requireNames = Object.keys(requires).map((name) => name.toLowerCase());

  if (hasArtisan || requireNames.includes("laravel/framework")) {
    frameworks.push("Laravel");
  }
  if (requireNames.includes("symfony/symfony")) {
    frameworks.push("Symfony");
  }

  return { languages, frameworks };
};
