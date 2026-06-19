import * as fs from "node:fs";
import * as path from "node:path";

export type PackageManager = "pnpm" | "yarn" | "npm" | "bun" | "unknown";

/**
 * Detects the package manager from lockfiles in the workspace root.
 * Falls back to "unknown" when no recognizable lockfile is present.
 */
export function detectPackageManager(root: string): PackageManager {
  const has = (file: string): boolean =>
    fs.existsSync(path.join(root, file));

  if (has("pnpm-lock.yaml")) {
    return "pnpm";
  }
  if (has("yarn.lock")) {
    return "yarn";
  }
  if (has("bun.lockb") || has("bun.lock")) {
    return "bun";
  }
  if (has("package-lock.json") || has("npm-shrinkwrap.json")) {
    return "npm";
  }
  return "unknown";
}

/** Returns the run prefix for a package manager (e.g. "pnpm", "npm run"). */
export function runPrefix(pm: PackageManager): string {
  switch (pm) {
    case "pnpm":
      return "pnpm";
    case "yarn":
      return "yarn";
    case "bun":
      return "bun run";
    case "npm":
    case "unknown":
    default:
      return "npm run";
  }
}
