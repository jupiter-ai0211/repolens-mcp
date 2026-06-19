import * as fs from "node:fs";
import * as path from "node:path";
import { readJsonFile } from "../core/readJson.js";
import { detectPackageManager } from "../core/packageManager.js";
import type { DetectionContext, PackageJsonLike } from "./types.js";

/** Builds the shared detection context by reading the workspace once. */
export function buildDetectionContext(root: string): DetectionContext {
  const pkg = readJsonFile<PackageJsonLike>(root, "package.json");
  const packageJson = pkg.exists ? pkg.data : null;

  const allDependencies = new Set<string>();
  for (const group of [
    packageJson?.dependencies,
    packageJson?.devDependencies,
    packageJson?.peerDependencies,
  ]) {
    if (group) {
      for (const dep of Object.keys(group)) {
        allDependencies.add(dep.toLowerCase());
      }
    }
  }

  const hasFile = (relativePath: string): boolean => {
    try {
      return fs.existsSync(path.join(root, relativePath));
    } catch {
      return false;
    }
  };

  return {
    root,
    packageManager: detectPackageManager(root),
    packageJson,
    allDependencies,
    hasFile,
  };
}
